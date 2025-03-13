import type { Maze } from "../utils/maze"
import { QuantumState } from "../utils/quantum-state"
import { complex } from "../utils/complex-utils"

/**
 * Represents a quantum-inspired neural network for maze solving
 * with quantum memory mechanisms
 */
export class QuantumMazeSolver {
  private _maze: Maze
  private _quantumState: QuantumState
  private _parameters: number[]
  private _exploredCells: Set<string>
  private _currentPath: { x: number; y: number }[]
  private _isTraining = false
  private _currentStep = 0
  private _totalSteps = 100 // Default steps
  private _loss: number[] = []
  private _learningRate = 0.3 // Increased from 0.1 for faster initial learning
  private _adaptiveLRCounter = 0
  private _bestLoss: number = Number.POSITIVE_INFINITY
  private _measurements: { x: number; y: number }[] = []
  
  // Quantum memory system - stores entangled states and their outcomes
  private _quantumMemory: {
    state: QuantumState;
    path: { x: number; y: number }[];
    loss: number;
    parameters: number[];
    timestamp: number;
  }[] = [];
  
  // Memory capacity - how many quantum states we can store
  private _memoryCapacity = 5;
  
  // Probability of recalling from memory
  private _recallProbability = 0.2;
  
  // Counter for successful memory recalls
  private _successfulRecalls = 0;

  /**
   * Creates a new quantum maze solver
   */
  constructor(maze: Maze) {
    this._maze = maze
    this._quantumState = new QuantumState(maze)
    this._exploredCells = new Set<string>()
    this._currentPath = [{ x: maze.start.x, y: maze.start.y }]

    // Initialize parameters (weights for the quantum circuit)
    // These parameters control how the quantum walk behaves
    this._parameters = Array(10)
      .fill(0)
      .map(() => Math.random() * Math.PI * 2)
  }

  /**
   * Gets the current maze with path information
   */
  get maze(): Maze {
    // Create a copy of the maze
    const mazeCopy = { ...this._maze }
    const cellsCopy = JSON.parse(JSON.stringify(this._maze.cells))

    // Mark cells in the current path
    for (const { x, y } of this._currentPath) {
      if (cellsCopy[y] && cellsCopy[y][x]) {
        cellsCopy[y][x].isPath = true
      }
    }

    // Mark explored cells
    for (const key of this._exploredCells) {
      const [x, y] = key.split(",").map(Number)
      if (cellsCopy[y] && cellsCopy[y][x]) {
        cellsCopy[y][x].isExplored = true
      }
    }

    // Mark cells with significant quantum amplitude
    const significantPositions = this._quantumState.getSignificantPositions(0.05)
    for (const { x, y } of significantPositions) {
      if (cellsCopy[y] && cellsCopy[y][x] && !cellsCopy[y][x].isPath) {
        // Add a property to indicate quantum probability
        ;(cellsCopy[y][x] as any).quantumProbability = this._quantumState.getProbability(x, y)
      }
    }

    return { ...mazeCopy, cells: cellsCopy }
  }

  /**
   * Gets the current training progress
   */
  get progress(): {
    isTraining: boolean
    currentStep: number
    totalSteps: number
    percentComplete: number
    loss: number[]
    learningRate: number
    memorizedStates: number
    successfulRecalls: number
  } {
    return {
      isTraining: this._isTraining,
      currentStep: this._currentStep,
      totalSteps: this._totalSteps,
      percentComplete: this._totalSteps > 0 ? (this._currentStep / this._totalSteps) * 100 : 0,
      loss: [...this._loss],
      learningRate: this._learningRate,
      memorizedStates: this._quantumMemory.length,
      successfulRecalls: this._successfulRecalls
    }
  }

  /**
   * Gets the current path
   */
  get currentPath(): { x: number; y: number }[] {
    return [...this._currentPath]
  }

  /**
   * Gets the quantum state information
   */
  get quantumState(): {
    significantPositions: { x: number; y: number; probability: number }[]
    measurements: { x: number; y: number }[]
  } {
    return {
      significantPositions: this._quantumState.getSignificantPositions(0.01),
      measurements: [...this._measurements],
    }
  }

  /**
   * Calculates the loss based on current path and end goal
   */
  private _calculateLoss(): number {
    if (this._currentPath.length === 0) return 1.0

    const lastPosition = this._currentPath[this._currentPath.length - 1]
    const { end } = this._maze

    // Manhattan distance to goal
    const distance = Math.abs(lastPosition.x - end.x) + Math.abs(lastPosition.y - end.y)

    // Normalize by maze size
    const normalizedDistance = distance / (this._maze.width + this._maze.height)

    // Path efficiency (penalize longer paths)
    const pathEfficiency = Math.min(1, this._currentPath.length / (this._maze.width * this._maze.height))

    // Custom loss function with margin
    const loss = normalizedDistance * 0.7 + pathEfficiency * 0.3

    // If we've reached the end, give a very low loss
    if (lastPosition.x === end.x && lastPosition.y === end.y) {
      return 0.01
    }

    return loss
  }

  /**
   * Updates parameters using parameter-shift rule
   */
  private _updateParameters(): void {
    // Only update parameters every few steps to save computation
    if (this._currentStep % 3 !== 0) return

    const originalLoss = this._calculateLoss()
    const gradients: number[] = []

    // Calculate gradients using parameter-shift rule
    // Only update a subset of parameters each time to save computation
    const paramSubset = this._currentStep % this._parameters.length
    const paramToUpdate =
      (paramSubset + Math.floor(this._currentStep / this._parameters.length)) % this._parameters.length

    // Store original parameter
    const originalParam = this._parameters[paramToUpdate]

    // Shift parameter forward
    this._parameters[paramToUpdate] = originalParam + Math.PI / 2

    // Apply quantum walk with shifted parameter
    const forwardState = new QuantumState(this._maze)
    for (let j = 0; j < 3; j++) {
      // Reduced iterations
      this._applyQuantumWalkWithParameters(forwardState)
    }

    // Measure and update path
    const forwardPath = this._simulatePath(forwardState)
    const forwardLoss = this._calculateLossForPath(forwardPath)

    // Shift parameter backward
    this._parameters[paramToUpdate] = originalParam - Math.PI / 2

    // Apply quantum walk with shifted parameter
    const backwardState = new QuantumState(this._maze)
    for (let j = 0; j < 3; j++) {
      // Reduced iterations
      this._applyQuantumWalkWithParameters(backwardState)
    }

    // Measure and update path
    const backwardPath = this._simulatePath(backwardState)
    const backwardLoss = this._calculateLossForPath(backwardPath)

    // Calculate gradient using parameter-shift rule
    const gradient = (forwardLoss - backwardLoss) / 2

    // Update just this parameter
    this._parameters[paramToUpdate] -= this._learningRate * gradient

    // Restore original parameter
    this._parameters[paramToUpdate] = this._parameters[paramToUpdate]

    // Adaptive learning rate
    if (originalLoss < this._bestLoss) {
      this._bestLoss = originalLoss
      this._adaptiveLRCounter = 0
      
      // Store the state in quantum memory when we find a better solution
      this._storeInQuantumMemory(originalLoss);
    } else {
      this._adaptiveLRCounter++

      // If loss hasn't improved for a while, reduce learning rate
      if (this._adaptiveLRCounter > 10) {
        this._learningRate *= 0.9
        this._adaptiveLRCounter = 0
        
        // When progress stalls, try to recall from quantum memory
        if (Math.random() < this._recallProbability) {
          this._recallFromQuantumMemory();
        }
      }
    }
  }

  /**
   * Stores the current quantum state in memory if it's novel and good
   */
  private _storeInQuantumMemory(loss: number): void {
    // If the path is doing well (lower loss) or is novel (reaches new areas)
    // store it in quantum memory
    
    // Only store states that have made substantial progress
    const pathLength = this._currentPath.length;
    const minPathThreshold = Math.min(5, Math.floor(this._maze.width / 3));
    
    // Check if we should store this state
    const shouldStore = 
      (loss < this._bestLoss * 1.1 && pathLength > minPathThreshold) || // Good path
      (this._currentPath.length > 0 && 
       this._currentPath[this._currentPath.length - 1].x === this._maze.end.x && 
       this._currentPath[this._currentPath.length - 1].y === this._maze.end.y); // Reached the end
    
    if (shouldStore) {
      // Create memory entry
      const memoryEntry = {
        state: this._quantumState.clone(), // Store a copy of the quantum state
        path: [...this._currentPath],  // Store the current path
        loss: loss,                    // Store the loss
        parameters: [...this._parameters], // Store the parameters
        timestamp: this._currentStep   // When it was stored
      };
      
      // Add to memory
      this._quantumMemory.push(memoryEntry);
      
      // If memory exceeds capacity, remove the least useful state
      if (this._quantumMemory.length > this._memoryCapacity) {
        // Sort by loss (higher is worse)
        this._quantumMemory.sort((a, b) => b.loss - a.loss);
        // Remove the highest loss entry
        this._quantumMemory.pop();
      }
    }
  }
  
  /**
   * Recalls a state from quantum memory
   * Uses quantum-inspired probabilistic recall
   */
  private _recallFromQuantumMemory(): void {
    if (this._quantumMemory.length === 0) return;
    
    // Calculate probabilities based on loss values (lower loss = higher probability)
    const totalLoss = this._quantumMemory.reduce((sum, entry) => sum + entry.loss, 0);
    const inverseProbs = this._quantumMemory.map(entry => 1 / entry.loss);
    const totalInverseProb = inverseProbs.reduce((sum, prob) => sum + prob, 0);
    
    // Normalize to get probabilities
    const probs = inverseProbs.map(prob => prob / totalInverseProb);
    
    // Quantum-inspired probabilistic selection
    let cumulativeProb = 0;
    const rand = Math.random();
    let selectedIndex = 0;
    
    for (let i = 0; i < probs.length; i++) {
      cumulativeProb += probs[i];
      if (rand <= cumulativeProb) {
        selectedIndex = i;
        break;
      }
    }
    
    // Get the selected memory
    const selectedMemory = this._quantumMemory[selectedIndex];
    
    // Apply the remembered quantum state and parameters with some quantum noise
    // to avoid getting stuck in the same pattern
    
    // Quantum superposition of past and present states
    // Blend the current state with the remembered state
    this._quantumState = selectedMemory.state.clone();
    
    // Partial reset of the path (keep some of current exploration)
    // This simulates quantum partial memory where some information is retained
    const keepRatio = 0.7; // Keep 70% of the recalled path
    const keepLength = Math.floor(selectedMemory.path.length * keepRatio);
    
    if (keepLength > 0) {
      this._currentPath = selectedMemory.path.slice(0, keepLength);
      this._successfulRecalls++;
    }
    
    // Adaptive parameter update - blend current parameters with remembered ones
    for (let i = 0; i < this._parameters.length; i++) {
      // 80% from memory, 20% from current parameters
      this._parameters[i] = selectedMemory.parameters[i] * 0.8 + this._parameters[i] * 0.2;
    }
    
    // Add quantum noise for exploration
    this._addQuantumNoise(this._quantumState, 0.03); // Slightly higher noise for exploration
  }

  /**
   * Applies quantum walk with current parameters
   */
  private _applyQuantumWalkWithParameters(state: QuantumState = this._quantumState): void {
    // Apply phase shifts based on parameters
    for (let y = 0; y < this._maze.height; y++) {
      for (let x = 0; x < this._maze.width; x++) {
        // Skip if cell has no amplitude
        if (state.getProbability(x, y) < 1e-10) continue

        // Calculate phase based on position and parameters
        const phase =
          (Math.sin(x * this._parameters[0] + y * this._parameters[1]) * this._parameters[2] +
            Math.cos(x * this._parameters[3] + y * this._parameters[4]) * this._parameters[5]) *
          0.1 // Scale down to avoid extreme phase shifts

        state.applyPhaseShift(x, y, phase)
      }
    }

    // Apply quantum walk step
    state.applyQuantumWalk(this._maze)

    // Add noise to simulate quantum decoherence
    this._addQuantumNoise(state)
  }

  /**
   * Adds realistic quantum noise to the state
   * @param state The quantum state to add noise to
   * @param noiseLevel Optional custom noise level (default: 0.01)
   */
  private _addQuantumNoise(state: QuantumState, noiseLevel: number = 0.01): void {
    for (let y = 0; y < this._maze.height; y++) {
      for (let x = 0; x < this._maze.width; x++) {
        // Skip if cell has no amplitude
        if (state.getProbability(x, y) < 1e-10) continue

        // Get current amplitude
        const amplitude = state.getAmplitude(x, y)

        // Add small random phase noise
        const phaseNoise = (Math.random() - 0.5) * noiseLevel * Math.PI
        const noiseAmplitude = complex(
          amplitude.real * Math.cos(phaseNoise) - amplitude.imag * Math.sin(phaseNoise),
          amplitude.real * Math.sin(phaseNoise) + amplitude.imag * Math.cos(phaseNoise),
        )

        state.setAmplitude(x, y, noiseAmplitude)
      }
    }
  }

  /**
   * Simulates a path by repeatedly measuring the quantum state
   */
  private _simulatePath(state: QuantumState): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = [{ x: this._maze.start.x, y: this._maze.start.y }]
    const visited = new Set<string>(`${this._maze.start.x},${this._maze.start.y}`)

    // Maximum path length to prevent infinite loops - reduced for efficiency
    const maxLength = Math.min(20, this._maze.width * this._maze.height)

    while (path.length < maxLength) {
      // Apply quantum walk - fewer iterations for speed
      for (let i = 0; i < 2; i++) {
        this._applyQuantumWalkWithParameters(state)
      }

      // Measure the state
      const position = state.measure()
      const posKey = `${position.x},${position.y}`

      // Skip if already visited (avoid loops)
      if (visited.has(posKey)) continue

      // Add to path
      path.push(position)
      visited.add(posKey)

      // Check if we reached the end
      if (position.x === this._maze.end.x && position.y === this._maze.end.y) {
        break
      }
    }

    return path
  }

  /**
   * Calculates loss for a specific path
   */
  private _calculateLossForPath(path: { x: number; y: number }[]): number {
    if (path.length === 0) return 1.0

    const lastPosition = path[path.length - 1]
    const { end } = this._maze

    // Manhattan distance to goal
    const distance = Math.abs(lastPosition.x - end.x) + Math.abs(lastPosition.y - end.y)

    // Normalize by maze size
    const normalizedDistance = distance / (this._maze.width + this._maze.height)

    // Path efficiency (penalize longer paths)
    const pathEfficiency = Math.min(1, path.length / (this._maze.width * this._maze.height))

    // Custom loss function with margin
    const loss = normalizedDistance * 0.7 + pathEfficiency * 0.3

    // If we've reached the end, give a very low loss
    if (lastPosition.x === end.x && lastPosition.y === end.y) {
      return 0.01
    }

    return loss
  }

  /**
   * Performs an ensemble prediction by making multiple measurements
   */
  private _ensemblePrediction(numSamples = 5): { x: number; y: number }[] {
    // Make multiple measurements
    const measurements: { x: number; y: number }[] = []

    for (let i = 0; i < numSamples; i++) {
      // Clone the quantum state to preserve it
      const tempState = new QuantumState(this._maze)

      // Apply quantum walk
      for (let j = 0; j < 5; j++) {
        this._applyQuantumWalkWithParameters(tempState)
      }

      // Measure
      const position = tempState.measure()
      measurements.push(position)
    }

    // Find the most common measurement
    const counts = new Map<string, number>()
    for (const pos of measurements) {
      const key = `${pos.x},${pos.y}`
      counts.set(key, (counts.get(key) || 0) + 1)
    }

    // Sort by count
    const sortedPositions = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([key]) => {
        const [x, y] = key.split(",").map(Number)
        return { x, y }
      })

    return sortedPositions
  }

  /**
   * Starts training the network to solve the maze
   */
  async startTraining(): Promise<void> {
    if (this._isTraining) return

    this._isTraining = true
    this._currentStep = 0
    this._totalSteps = this._maze.width * this._maze.height * 10 // Scale steps by maze size
    this._loss = []
    this._exploredCells = new Set<string>()
    this._currentPath = [{ x: this._maze.start.x, y: this._maze.start.y }]
    this._measurements = []

    // Reset quantum state
    this._quantumState = new QuantumState(this._maze)

    // Training loop - process multiple steps per frame
    const stepsPerFrame = 2 // Process 2 steps per animation frame

    while (this._isTraining && this._currentStep < this._totalSteps) {
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          // Process multiple steps at once
          for (let i = 0; i < stepsPerFrame && this._currentStep < this._totalSteps && this._isTraining; i++) {
            // Apply quantum walk
            this._applyQuantumWalkWithParameters()

            // Make ensemble prediction
            const predictions = this._ensemblePrediction(5)
            this._measurements = predictions

            // Update explored cells
            const significantPositions = this._quantumState.getSignificantPositions(0.05)
            for (const { x, y } of significantPositions) {
              this._exploredCells.add(`${x},${y}`)
            }

            // Update path if we have a good prediction
            if (predictions.length > 0) {
              const bestPrediction = predictions[0]
              const lastPosition = this._currentPath[this._currentPath.length - 1]

              // Check if the prediction is adjacent to the last position
              const dx = Math.abs(bestPrediction.x - lastPosition.x)
              const dy = Math.abs(bestPrediction.y - lastPosition.y)

              if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
                // Check if there's no wall between them
                const cell = this._maze.cells[lastPosition.y][lastPosition.x]

                if (
                  (bestPrediction.x > lastPosition.x && !cell.walls.right) ||
                  (bestPrediction.x < lastPosition.x && !cell.walls.left) ||
                  (bestPrediction.y > lastPosition.y && !cell.walls.bottom) ||
                  (bestPrediction.y < lastPosition.y && !cell.walls.top)
                ) {
                  this._currentPath.push(bestPrediction)
                  
                  // Check if we reached the goal and store in memory immediately
                  if (bestPrediction.x === this._maze.end.x && bestPrediction.y === this._maze.end.y) {
                    const finalLoss = this._calculateLoss();
                    this._storeInQuantumMemory(finalLoss);
                  }
                }
              }
            }

            // Calculate loss
            const currentLoss = this._calculateLoss()
            this._loss.push(currentLoss)

            // Update parameters using parameter-shift rule
            this._updateParameters()

            this._currentStep++
          }

          resolve()
        }, 20) // Faster refresh rate
      })
    }

    this._isTraining = false
  }

  /**
   * Stops the training process
   */
  stopTraining(): void {
    this._isTraining = false
  }

  /**
   * Resets the network and clears the current path
   * Preserves quantum memory if requested
   */
  reset(preserveMemory: boolean = true): void {
    this.stopTraining()
    this._currentStep = 0
    this._loss = []
    this._currentPath = [{ x: this._maze.start.x, y: this._maze.start.y }]
    this._exploredCells = new Set<string>()
    this._quantumState = new QuantumState(this._maze)
    this._parameters = Array(10)
      .fill(0)
      .map(() => Math.random() * Math.PI * 2)
    this._learningRate = 0.3 // Increased from 0.1
    this._adaptiveLRCounter = 0
    this._bestLoss = Number.POSITIVE_INFINITY
    this._measurements = []
    
    // Optionally preserve quantum memory
    if (!preserveMemory) {
      this._quantumMemory = [];
      this._successfulRecalls = 0;
    }
  }
}

