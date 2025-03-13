import { type Maze, findPath } from "../utils/maze"

/**
 * Simplified quantum-inspired neural network for maze solving
 * This is a simulation that mimics how a quantum neural network might approach the problem
 */
export class MazeSolverNN {
  private _maze: Maze
  private _exploredCells: { x: number; y: number }[] = []
  private _currentPath: { x: number; y: number }[] = []
  private _optimalPath: { x: number; y: number }[] = []
  private _isTraining = false
  private _currentStep = 0
  private _totalSteps = 0
  private _loss: number[] = []
  private _isSolved = false  // Added property to track maze solved state

  constructor(maze: Maze) {
    this._maze = maze

    // Find the optimal path for comparison
    const { path } = findPath(maze)
    this._optimalPath = path
    this._totalSteps = path.length * 2 // We'll use twice the optimal path length for training steps
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
      if (cellsCopy[y][x]) {
        cellsCopy[y][x].isPath = true
      }
    }

    // Mark explored cells
    for (const { x, y } of this._exploredCells) {
      if (cellsCopy[y][x]) {
        cellsCopy[y][x].isExplored = true
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
    isSolved: boolean  // Added isSolved to the returned progress object
  } {
    return {
      isTraining: this._isTraining,
      currentStep: this._currentStep,
      totalSteps: this._totalSteps,
      percentComplete: this._totalSteps > 0 ? (this._currentStep / this._totalSteps) * 100 : 0,
      loss: [...this._loss],
      isSolved: this._isSolved  // Return the solved state
    }
  }

  /**
   * Gets the current path
   */
  get currentPath(): { x: number; y: number }[] {
    return [...this._currentPath]
  }

  /**
   * Gets the optimal path
   */
  get optimalPath(): { x: number; y: number }[] {
    return [...this._optimalPath]
  }

  /**
   * Checks if the maze is solved
   */
  get isSolved(): boolean {
    return this._isSolved
  }

  /**
   * Starts training the network to solve the maze
   */
  async startTraining(): Promise<void> {
    if (this._isTraining) return

    this._isTraining = true
    this._currentStep = 0
    this._loss = []
    this._currentPath = []
    this._exploredCells = []
    this._isSolved = false  // Reset solved state at the start of training

    // Simulate quantum neural network training
    // In a real implementation, this would use quantum circuits and parameter optimization

    // For simulation, we'll gradually reveal the optimal path with some exploration
    const { path, explored } = findPath(this._maze)

    // Calculate total steps based on path length and exploration
    this._totalSteps = path.length + explored.length

    // First phase: exploration (simulates the network learning the maze structure)
    for (let i = 0; i < explored.length && this._isTraining; i++) {
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          this._currentStep++
          this._exploredCells.push(explored[i])

          // Calculate simulated loss (decreasing as we explore more)
          const explorationProgress = i / explored.length
          const currentLoss = 0.5 - 0.3 * explorationProgress + 0.1 * Math.sin(explorationProgress * 10)
          this._loss.push(Math.max(0.05, currentLoss))

          resolve()
        }, 50) // Adjust speed as needed
      })
    }

    // Second phase: path finding (simulates the network converging to a solution)
    this._currentPath = [path[0]] // Start with the first cell

    for (let i = 1; i < path.length && this._isTraining; i++) {
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          this._currentStep++
          this._currentPath.push(path[i])

          // Calculate simulated loss (decreasing as we find the path)
          const pathProgress = i / path.length
          const currentLoss = 0.2 - 0.15 * pathProgress + 0.05 * Math.sin(pathProgress * 5)
          this._loss.push(Math.max(0.01, currentLoss))

          // Check if we've reached the end point and update solved state
          const lastPosition = path[i]
          if (lastPosition.x === this._maze.end.x && lastPosition.y === this._maze.end.y) {
            this._isSolved = true
          }

          resolve()
        }, 100) // Slower for path finding to make it more visible
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
   */
  reset(): void {
    this.stopTraining()
    this._currentStep = 0
    this._loss = []
    this._currentPath = []
    this._exploredCells = []
    this._isSolved = false  // Reset solved state when resetting the solver
  }
}

