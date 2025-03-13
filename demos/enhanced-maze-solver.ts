import { EnhancedQuantumNeuralNetwork } from "../neural/enhanced-quantum-neural-network"
import type { Maze } from "../utils/maze"
import { QuantumState } from "../utils/quantum-state"

export interface EnhancedOptimizerConfig {
  learningRate: number
  weightDecay: number
  useAdam: boolean
  beta1: number
  beta2: number
  epsilon: number
}

export type LossFunction = (predictions: number[], targets: number[]) => number
export type GradientFunction = (predictions: number[], targets: number[]) => number[]

export class EnhancedMazeSolver {
  private _network: EnhancedQuantumNeuralNetwork
  private _maze: Maze
  private _quantumState: QuantumState
  private _exploredCells: Set<string>
  private _currentPath: { x: number; y: number }[]
  private _isTraining = false
  private _currentStep = 0
  private _totalSteps = 0
  private _loss: number[] = []
  private _isSolved = false
  private _epsilon = 1.0 // For epsilon-greedy exploration
  private _rewardHistory: number[] = []
  private _experienceBuffer: {
    state: number[]
    action: number
    reward: number
    nextState: number[]
    done: boolean
  }[] = []
  private _bufferSize = 2000
  private _miniBatchSize = 64

  // Add a property to track tunneling
  private _lastTunneledWall = false
  private _tunneledPositions: { x: number; y: number }[] = []

  // Add a property to track the successful path
  private _successfulPath: { x: number; y: number }[] = []
  private _isReplaying = false
  private _replayIndex = 0
  private _replaySpeed = 300 // milliseconds between steps

  constructor(maze: Maze) {
    this._maze = maze
    this._quantumState = new QuantumState(maze)
    this._exploredCells = new Set<string>()
    this._currentPath = [{ x: maze.start.x, y: maze.start.y }]

    const inputSize = 10
    this._network = new EnhancedQuantumNeuralNetwork({
      inputSize: inputSize,
      layerSizes: [32, 32, 4],
      layerConfigs: [
        {
          neuronConfig: {
            numQubits: 5,
            activationFunction: "quantum",
            useQuantumPhaseActivation: true,
            useAmplitudeEncoding: true,
            quantumNoiseResilience: 0.02,
            initializationScale: 0.1,
          },
          useBatchNormalization: true,
          useResidualConnection: true,
          useAttentionMechanism: true,
          dropoutRate: 0.2,
        },
        {
          neuronConfig: {
            numQubits: 5,
            activationFunction: "tanh",
            useQuantumPhaseActivation: true,
            quantumNoiseResilience: 0.01,
          },
          useLayerNormalization: true,
          useResidualConnection: true,
          dropoutRate: 0.1,
        },
        {
          neuronConfig: {
            numQubits: 3,
            activationFunction: "sigmoid",
            useQuantumPhaseActivation: false,
          },
        },
      ],
      useSkipConnections: true,
      useGradientClipping: true,
      gradientClipValue: 1.0,
    })
  }

  get maze(): Maze {
    const mazeCopy = { ...this._maze }
    const cellsCopy = JSON.parse(JSON.stringify(this._maze.cells))

    for (const { x, y } of this._currentPath) {
      if (cellsCopy[y][x]) {
        cellsCopy[y][x].isPath = true
      }
    }

    for (const key of this._exploredCells) {
      const [x, y] = key.split(",").map(Number)
      if (cellsCopy[y][x]) {
        cellsCopy[y][x].isExplored = true
      }
    }

    const significantPositions = this._quantumState.getSignificantPositions(0.05)
    for (const { x, y, probability } of significantPositions) {
      if (cellsCopy[y][x] && !cellsCopy[y][x].isPath) {
        ;(cellsCopy[y][x] as any).quantumProbability = probability
      }
    }

    return { ...mazeCopy, cells: cellsCopy }
  }

  // Modify the progress getter to include replay state
  get progress(): {
    isTraining: boolean
    currentStep: number
    totalSteps: number
    percentComplete: number
    loss: number[]
    isSolved: boolean
    averageReward: number
    bufferSize: number
    isReplaying: boolean
    successfulPath: { x: number; y: number }[]
  } {
    const recentRewards = this._rewardHistory.slice(-100)
    const avgReward = recentRewards.length > 0 ? recentRewards.reduce((a, b) => a + b, 0) / recentRewards.length : 0

    return {
      isTraining: this._isTraining,
      currentStep: this._currentStep,
      totalSteps: this._totalSteps,
      percentComplete: this._totalSteps > 0 ? (this._currentStep / this._totalSteps) * 100 : 0,
      loss: [...this._loss],
      isSolved: this._isSolved,
      averageReward: avgReward,
      bufferSize: this._experienceBuffer.length,
      isReplaying: this._isReplaying,
      successfulPath: [...this._successfulPath],
    }
  }

  get currentPath(): { x: number; y: number }[] {
    return [...this._currentPath]
  }

  get quantumState(): {
    significantPositions: { x: number; y: number; probability: number }[]
  } {
    return {
      significantPositions: this._quantumState.getSignificantPositions(0.01),
    }
  }

  private _getInputForPosition(x: number, y: number): number[] {
    const cell = this._maze.cells[y][x]
    const prevMove = this._currentPath.length > 1 ? this._currentPath[this._currentPath.length - 2] : { x, y }
    return [
      x / this._maze.width,
      y / this._maze.height,
      this._maze.end.x / this._maze.width,
      this._maze.end.y / this._maze.height,
      cell.walls.top ? 1 : 0,
      cell.walls.right ? 1 : 0,
      cell.walls.bottom ? 1 : 0,
      cell.walls.left ? 1 : 0,
      (x - prevMove.x) / this._maze.width,
      (y - prevMove.y) / this._maze.height,
    ]
  }

  private _calculateReward(newX: number, newY: number, oldX: number, oldY: number): number {
    // Calculate distance to goal before and after move
    const oldDistanceToGoal = Math.abs(oldX - this._maze.end.x) + Math.abs(oldY - this._maze.end.y)
    const newDistanceToGoal = Math.abs(newX - this._maze.end.x) + Math.abs(newY - this._maze.end.y)

    // Reward for moving closer to the goal
    const distanceReward = (oldDistanceToGoal - newDistanceToGoal) * 0.5

    // Penalty for revisiting cells (encourages exploration)
    const cellKey = `${newX},${newY}`
    const explorationPenalty = this._exploredCells.has(cellKey) ? -0.2 : 0.1

    // Big reward for reaching the goal
    const goalReward = newX === this._maze.end.x && newY === this._maze.end.y ? 10.0 : 0.0

    // Small penalty for each step (encourages efficiency)
    const stepPenalty = -0.01

    // Reward for quantum tunneling (if it occurred)
    const tunnelReward = this._lastTunneledWall ? 0.5 : 0

    // Combine all rewards
    const totalReward = distanceReward + explorationPenalty + goalReward + stepPenalty + tunnelReward

    // Track rewards for monitoring
    this._rewardHistory.push(totalReward)
    if (this._rewardHistory.length > 1000) {
      this._rewardHistory.shift()
    }

    return totalReward
  }

  async startTraining(): Promise<void> {
    if (this._isTraining) return

    this._isTraining = true
    this._currentStep = 0
    this._totalSteps = this._maze.width * this._maze.height * 20
    this._loss = []
    this._exploredCells = new Set<string>()
    this._currentPath = [{ x: this._maze.start.x, y: this._maze.start.y }]
    this._isSolved = false
    this._rewardHistory = []
    this._tunneledPositions = []
    this._lastTunneledWall = false
    this._successfulPath = []

    // Keep some old experiences for stability
    if (this._experienceBuffer.length > 0) {
      const keepCount = Math.floor(this._experienceBuffer.length * 0.2)
      this._experienceBuffer = this._experienceBuffer.slice(-keepCount)
    }

    this._quantumState = new QuantumState(this._maze)

    // Training loop - process more steps per frame for speed
    while (this._isTraining && this._currentStep < this._totalSteps) {
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          // Process more steps per frame for better performance
          for (let i = 0; i < 15 && this._currentStep < this._totalSteps && this._isTraining; i++) {
            // Current position
            const currentPos = this._currentPath[this._currentPath.length - 1]
            const input = this._getInputForPosition(currentPos.x, currentPos.y)

            // Epsilon-greedy action selection
            let action: number
            if (Math.random() < this._epsilon) {
              action = Math.floor(Math.random() * 4)
            } else {
              const output = this._network.forward(input) as number[]
              action = output.indexOf(Math.max(...output))
            }

            // Execute action
            let newX = currentPos.x
            let newY = currentPos.y
            let validMove = false
            this._lastTunneledWall = false

            // Check if the move is valid (no wall)
            if (action === 0 && !this._maze.cells[currentPos.y][currentPos.x].walls.top) {
              newY--
              validMove = true
            } else if (action === 1 && !this._maze.cells[currentPos.y][currentPos.x].walls.right) {
              newX++
              validMove = true
            } else if (action === 2 && !this._maze.cells[currentPos.y][currentPos.x].walls.bottom) {
              newY++
              validMove = true
            } else if (action === 3 && !this._maze.cells[currentPos.y][currentPos.x].walls.left) {
              newX--
              validMove = true
            } else {
              // Quantum tunneling effect - occasionally allow moving through walls
              // Higher probability when closer to the goal
              const distanceToGoal =
                Math.abs(currentPos.x - this._maze.end.x) + Math.abs(currentPos.y - this._maze.end.y)
              const tunnelProbability = 0.05 + 0.1 * (1 - distanceToGoal / (this._maze.width + this._maze.height))

              if (Math.random() < tunnelProbability) {
                // Determine which wall to tunnel through
                if (action === 0 && currentPos.y > 0) {
                  newY--
                  validMove = true
                  this._lastTunneledWall = true
                  this._tunneledPositions.push({ x: newX, y: newY })
                } else if (action === 1 && currentPos.x < this._maze.width - 1) {
                  newX++
                  validMove = true
                  this._lastTunneledWall = true
                  this._tunneledPositions.push({ x: newX, y: newY })
                } else if (action === 2 && currentPos.y < this._maze.height - 1) {
                  newY++
                  validMove = true
                  this._lastTunneledWall = true
                  this._tunneledPositions.push({ x: newX, y: newY })
                } else if (action === 3 && currentPos.x > 0) {
                  newX--
                  validMove = true
                  this._lastTunneledWall = true
                  this._tunneledPositions.push({ x: newX, y: newY })
                }
              }
            }

            const reward = validMove ? this._calculateReward(newX, newY, currentPos.x, currentPos.y) : -0.5

            if (validMove) {
              this._currentPath.push({ x: newX, y: newY })
              this._exploredCells.add(`${newX},${newY}`)
            }

            const nextState = validMove
              ? this._getInputForPosition(newX, newY)
              : this._getInputForPosition(currentPos.x, currentPos.y)

            const reachedGoal = newX === this._maze.end.x && newY === this._maze.end.y

            // Store experience in replay buffer
            this._experienceBuffer.push({
              state: input,
              action,
              reward,
              nextState,
              done: reachedGoal,
            })

            // Limit buffer size
            if (this._experienceBuffer.length > this._bufferSize) {
              this._experienceBuffer.shift()
            }

            // Train less frequently for speed (every 3 steps)
            if (this._experienceBuffer.length >= this._miniBatchSize && this._currentStep % 3 === 0) {
              const loss = this._trainOnMiniBatch()
              this._loss.push(loss)
            }

            // Update quantum state less frequently
            if (this._currentStep % 2 === 0) {
              this._quantumState.applyQuantumWalk(this._maze)
            }

            this._currentStep++

            // Check if we've reached the goal
            if (reachedGoal) {
              this._isSolved = true

              // Store the successful path before resetting
              this._successfulPath = [...this._currentPath]

              // Stop training
              this._isTraining = false

              console.log("Path found! Training stopped.")
              break
            }
          }

          // Decay epsilon less frequently
          if (this._currentStep % 10 === 0) {
            this._epsilon = Math.max(0.05, this._epsilon * 0.999)
          }

          resolve()
        }, 0) // Use 0ms timeout for maximum speed
      })
    }

    this._isTraining = false
  }

  // Add a getter for tunneled positions
  get tunneledPositions(): { x: number; y: number }[] {
    return [...this._tunneledPositions]
  }

  // Optimize mini-batch sampling for speed
  private _sampleMiniBatch(): any[] {
    // Fast batch sampling - use a fixed recent portion and random sampling
    const batch = []

    // Include some recent experiences (most important for learning)
    const recentCount = Math.min(10, this._experienceBuffer.length)
    for (let i = 0; i < recentCount; i++) {
      const idx = this._experienceBuffer.length - 1 - i
      if (idx >= 0) {
        batch.push(this._experienceBuffer[idx])
      }
    }

    // Fill the rest with random samples without checking for duplicates (faster)
    const remaining = this._miniBatchSize - batch.length
    for (let i = 0; i < remaining; i++) {
      const idx = Math.floor(Math.random() * (this._experienceBuffer.length - recentCount))
      batch.push(this._experienceBuffer[idx])
    }

    return batch
  }

  // Optimize training on mini-batch for speed
  private _trainOnMiniBatch(): number {
    const batch = this._sampleMiniBatch()
    const states = batch.map((exp) => exp.state)
    const actions = batch.map((exp) => exp.action)
    const rewards = batch.map((exp) => exp.reward)
    const nextStates = batch.map((exp) => exp.nextState)
    const dones = batch.map((exp) => (exp.done ? 1 : 0))

    // Get current Q-values
    const currentQValues = states.map((state) => this._network.forward(state) as number[])

    // Get next Q-values with less frequent dropout toggling
    const useDropout = this._currentStep % 5 === 0
    if (useDropout) this._network.training = false
    const nextQValues = nextStates.map((state) => this._network.forward(state) as number[])
    if (useDropout) this._network.training = true

    // Calculate target Q-values - optimize for speed
    const targetQValues = currentQValues.map((qValues, i) => {
      const qValuesCopy = [...qValues]

      if (dones[i]) {
        qValuesCopy[actions[i]] = rewards[i]
      } else {
        const nextQ = nextQValues[i]
        // Find max Q-value faster
        let maxQ = nextQ[0]
        let bestAction = 0
        for (let j = 1; j < nextQ.length; j++) {
          if (nextQ[j] > maxQ) {
            maxQ = nextQ[j]
            bestAction = j
          }
        }

        const discountFactor = 0.99
        qValuesCopy[actions[i]] = rewards[i] + discountFactor * maxQ
      }

      return qValuesCopy
    })

    // Add numerical stability checks to prevent NaN
    for (let i = 0; i < targetQValues.length; i++) {
      for (let j = 0; j < targetQValues[i].length; j++) {
        // Check for NaN or Infinity and replace with safe values
        if (isNaN(targetQValues[i][j]) || !isFinite(targetQValues[i][j])) {
          targetQValues[i][j] = 0
        }

        // Clip to reasonable range to prevent extreme values
        targetQValues[i][j] = Math.max(-10, Math.min(10, targetQValues[i][j]))
      }
    }

    // Train with optimized parameters and safer loss function
    try {
      return this._network.trainBatch(states, targetQValues, {
        batchSize: batch.length,
        optimizer: {
          learningRate: 0.0005, // Reduced learning rate for stability
          weightDecay: 0.00001, // Reduced weight decay
          useAdam: true,
          beta1: 0.9,
          beta2: 0.999,
          epsilon: 1e-8,
        },
        lossFunction: this._safeLossFunction,
        gradientFunction: this._safeGradientFunction,
      })
    } catch (error) {
      console.error("Error in training batch:", error)
      return 0 // Return a default value if training fails
    }
  }

  // Add safe loss function to prevent NaN
  private _safeLossFunction(predictions: number[], targets: number[]): number {
    let sum = 0
    for (let i = 0; i < predictions.length; i++) {
      // Ensure values are finite
      const pred = isFinite(predictions[i]) ? predictions[i] : 0
      const target = isFinite(targets[i]) ? targets[i] : 0

      const diff = pred - target
      // Use Huber loss for robustness
      const absDiff = Math.abs(diff)
      const delta = 1.0

      if (absDiff <= delta) {
        sum += 0.5 * diff * diff
      } else {
        sum += delta * (absDiff - 0.5 * delta)
      }
    }

    const result = sum / predictions.length
    return isFinite(result) ? result : 0.1 // Ensure return value is finite
  }

  // Add safe gradient function to prevent NaN
  private _safeGradientFunction(predictions: number[], targets: number[]): number[] {
    return predictions.map((pred, i) => {
      // Ensure values are finite
      pred = isFinite(pred) ? pred : 0
      const target = isFinite(targets[i]) ? targets[i] : 0

      const diff = pred - target
      const absDiff = Math.abs(diff)
      const delta = 1.0

      let gradient
      if (absDiff <= delta) {
        gradient = diff / predictions.length
      } else {
        gradient = (delta * Math.sign(diff)) / predictions.length
      }

      // Ensure gradient is finite and clip to reasonable range
      return isFinite(gradient) ? Math.max(-1, Math.min(1, gradient)) : 0
    })
  }

  // Add a method to start the replay
  startReplay(speed?: number): void {
    if (this._successfulPath.length === 0) {
      console.warn("No successful path to replay")
      return
    }

    // Set replay speed if provided
    if (speed !== undefined) {
      this._replaySpeed = speed
    }

    // Reset current path to just the start position
    this._currentPath = [this._successfulPath[0]]
    this._isReplaying = true
    this._replayIndex = 0

    // Schedule the next step
    this._scheduleNextReplayStep()
  }

  // Add a method to handle replay steps
  private _scheduleNextReplayStep(): void {
    if (!this._isReplaying || this._replayIndex >= this._successfulPath.length - 1) {
      this._isReplaying = false
      return
    }

    // Schedule the next step
    setTimeout(() => {
      this._replayIndex++
      // Update the current path to show progress along the successful path
      this._currentPath = this._successfulPath.slice(0, this._replayIndex + 1)
      this._scheduleNextReplayStep()
    }, this._replaySpeed)
  }

  // Add a method to stop the replay
  stopReplay(): void {
    this._isReplaying = false
  }

  stopTraining(): void {
    this._isTraining = false
  }

  // Modify the reset method to clear the successful path
  reset(): void {
    this.stopTraining()
    this.stopReplay()
    this._currentStep = 0
    this._loss = []
    this._currentPath = [{ x: this._maze.start.x, y: this._maze.start.y }]
    this._exploredCells = new Set<string>()
    this._quantumState = new QuantumState(this._maze)
    this._isSolved = false
    this._network.resetMemory()
    this._epsilon = 1.0
    this._successfulPath = []
    // Keep experience buffer for transfer learning
  }
}

