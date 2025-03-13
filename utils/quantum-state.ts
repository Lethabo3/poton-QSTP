import { type Complex, complex, add, scale, magnitude, ZERO, ONE } from "./complex-utils"
import type { Maze } from "./maze"

/**
 * Represents a quantum-inspired state for maze solving
 */
export class QuantumState {
  private _width: number
  private _height: number
  private _amplitudes: Complex[][]
  private _entanglementMap: Map<string, string[]>

  /**
   * Creates a new quantum state for the maze
   */
  constructor(maze: Maze) {
    this._width = maze.width
    this._height = maze.height

    // Initialize amplitudes for each cell
    this._amplitudes = Array(this._height)
      .fill(0)
      .map(() =>
        Array(this._width)
          .fill(0)
          .map(() => ZERO),
      )

    // Initialize with amplitude at start position
    this._amplitudes[maze.start.y][maze.start.x] = ONE

    // Create entanglement map (cells that can affect each other)
    this._entanglementMap = new Map()

    // Build entanglement based on maze connectivity
    for (let y = 0; y < this._height; y++) {
      for (let x = 0; x < this._width; x++) {
        const cell = maze.cells[y][x]
        const key = `${x},${y}`
        const entangled: string[] = []

        // Add connected cells to entanglement map
        if (!cell.walls.top && y > 0) entangled.push(`${x},${y - 1}`)
        if (!cell.walls.right && x < this._width - 1) entangled.push(`${x + 1},${y}`)
        if (!cell.walls.bottom && y < this._height - 1) entangled.push(`${x},${y + 1}`)
        if (!cell.walls.left && x > 0) entangled.push(`${x - 1},${y}`)

        this._entanglementMap.set(key, entangled)
      }
    }
  }

  /**
   * Gets the amplitude at a specific position
   */
  getAmplitude(x: number, y: number): Complex {
    if (x < 0 || x >= this._width || y < 0 || y >= this._height) {
      return ZERO
    }
    return this._amplitudes[y][x]
  }

  /**
   * Sets the amplitude at a specific position
   */
  setAmplitude(x: number, y: number, amplitude: Complex): void {
    if (x < 0 || x >= this._width || y < 0 || y >= this._height) {
      return
    }
    this._amplitudes[y][x] = amplitude
  }

  /**
   * Gets the probability of being at a specific position
   */
  getProbability(x: number, y: number): number {
    const amplitude = this.getAmplitude(x, y)
    return magnitude(amplitude) ** 2
  }

  /**
   * Applies a phase shift to a specific position
   */
  applyPhaseShift(x: number, y: number, phase: number): void {
    const amplitude = this.getAmplitude(x, y)
    const newAmplitude = complex(
      amplitude.real * Math.cos(phase) - amplitude.imag * Math.sin(phase),
      amplitude.real * Math.sin(phase) + amplitude.imag * Math.cos(phase),
    )
    this.setAmplitude(x, y, newAmplitude)
  }

  /**
   * Applies a quantum walk step (spreading amplitudes to neighbors)
   */
  applyQuantumWalk(maze: Maze): void {
    // Create a copy of current amplitudes
    const newAmplitudes: Complex[][] = Array(this._height)
      .fill(0)
      .map(() =>
        Array(this._width)
          .fill(0)
          .map(() => ZERO),
      )

    // Apply quantum walk rules - only process cells with significant amplitude
    for (let y = 0; y < this._height; y++) {
      for (let x = 0; x < this._width; x++) {
        const currentAmplitude = this.getAmplitude(x, y)

        // Skip if no significant amplitude at this position (optimization)
        if (magnitude(currentAmplitude) < 1e-6) continue

        const cell = maze.cells[y][x]
        const neighbors: { x: number; y: number }[] = []

        // Find accessible neighbors
        if (!cell.walls.top && y > 0) neighbors.push({ x, y: y - 1 })
        if (!cell.walls.right && x < this._width - 1) neighbors.push({ x: x + 1, y })
        if (!cell.walls.bottom && y < this._height - 1) neighbors.push({ x, y: y + 1 })
        if (!cell.walls.left && x > 0) neighbors.push({ x: x - 1, y })

        // If end cell, increase probability of staying
        if (cell.isEnd) {
          newAmplitudes[y][x] = add(newAmplitudes[y][x], scale(currentAmplitude, 0.5))
        }

        // Distribute amplitude to neighbors (with phase)
        const distributionFactor = 1 / (neighbors.length + (cell.isEnd ? 1 : 0))

        for (const neighbor of neighbors) {
          // Add phase based on direction (quantum interference)
          const dx = neighbor.x - x
          const dy = neighbor.y - y
          const phase = Math.atan2(dy, dx) * 0.5 // Phase based on direction

          const spreadAmplitude = complex(
            currentAmplitude.real * Math.cos(phase) - currentAmplitude.imag * Math.sin(phase),
            currentAmplitude.real * Math.sin(phase) + currentAmplitude.imag * Math.cos(phase),
          )

          newAmplitudes[neighbor.y][neighbor.x] = add(
            newAmplitudes[neighbor.y][neighbor.x],
            scale(spreadAmplitude, distributionFactor),
          )
        }

        // Add quantum tunneling effect - small probability to pass through walls
        // This creates a more quantum-like behavior with non-zero probability of being in unreachable cells
        const tunnelProbability = 0.15 // Probability of tunneling

        // Check all four directions for potential tunneling
        const potentialTunnels = [
          { dx: 0, dy: -1 }, // top
          { dx: 1, dy: 0 }, // right
          { dx: 0, dy: 1 }, // bottom
          { dx: -1, dy: 0 }, // left
        ]

        for (const { dx, dy } of potentialTunnels) {
          const nx = x + dx
          const ny = y + dy

          // Check if the position is valid and not already a neighbor (has a wall)
          if (
            nx >= 0 &&
            nx < this._width &&
            ny >= 0 &&
            ny < this._height &&
            !neighbors.some((n) => n.x === nx && n.y === ny)
          ) {
            // Apply tunneling with reduced probability
            if (Math.random() < tunnelProbability) {
              const tunnelPhase = Math.random() * Math.PI * 2 // Random phase for tunneling

              const tunnelAmplitude = complex(
                currentAmplitude.real * Math.cos(tunnelPhase) - currentAmplitude.imag * Math.sin(tunnelPhase),
                currentAmplitude.real * Math.sin(tunnelPhase) + currentAmplitude.imag * Math.cos(tunnelPhase),
              )

              // Tunneling has reduced amplitude
              newAmplitudes[ny][nx] = add(newAmplitudes[ny][nx], scale(tunnelAmplitude, 0.1 * distributionFactor))
            }
          }
        }
      }
    }

    // Apply entanglement effects - but only for cells with significant amplitude
    const significantCells: [number, number][] = []
    for (let y = 0; y < this._height; y++) {
      for (let x = 0; x < this._width; x++) {
        if (magnitude(newAmplitudes[y][x]) >= 1e-6) {
          significantCells.push([x, y])
        }
      }
    }

    // Only process entanglement for significant cells
    for (const [x, y] of significantCells) {
      const key = `${x},${y}`
      const entangled = this._entanglementMap.get(key) || []

      for (const entangledKey of entangled) {
        const [ex, ey] = entangledKey.split(",").map(Number)

        // Only process if the entangled cell also has significant amplitude
        if (magnitude(newAmplitudes[ey][ex]) < 1e-6) continue

        // Create subtle correlation between entangled cells
        const currentAmp = newAmplitudes[y][x]
        const entangledAmp = newAmplitudes[ey][ex]

        // Small entanglement effect (0.05 of amplitude transfers)
        newAmplitudes[y][x] = add(scale(currentAmp, 0.95), scale(entangledAmp, 0.05))
      }
    }

    // Normalize the state
    let totalProbability = 0
    for (const [x, y] of significantCells) {
      totalProbability += magnitude(newAmplitudes[y][x]) ** 2
    }

    const normalizationFactor = 1 / Math.sqrt(totalProbability)

    // Reset all amplitudes
    this._amplitudes = Array(this._height)
      .fill(0)
      .map(() =>
        Array(this._width)
          .fill(0)
          .map(() => ZERO),
      )

    // Only set significant amplitudes
    for (const [x, y] of significantCells) {
      this._amplitudes[y][x] = scale(newAmplitudes[y][x], normalizationFactor)
    }
  }

  /**
   * Performs a measurement of the quantum state
   * Returns the position where the state collapsed to
   */
  measure(): { x: number; y: number } {
    // Calculate cumulative probabilities
    const probabilities: { x: number; y: number; prob: number; cumulative: number }[] = []
    let totalProb = 0

    for (let y = 0; y < this._height; y++) {
      for (let x = 0; x < this._width; x++) {
        const prob = this.getProbability(x, y)
        totalProb += prob
        probabilities.push({ x, y, prob, cumulative: totalProb })
      }
    }

    // Normalize cumulative probabilities
    if (totalProb > 0) {
      for (const p of probabilities) {
        p.cumulative /= totalProb
      }
    }

    // Random selection based on probability
    const r = Math.random()
    const selected = probabilities.find((p) => r <= p.cumulative) || { x: 0, y: 0 } // Default to (0,0) if nothing found

    // Collapse the state
    for (let y = 0; y < this._height; y++) {
      for (let x = 0; x < this._width; x++) {
        this._amplitudes[y][x] = ZERO
      }
    }

    this._amplitudes[selected.y][selected.x] = ONE

    return { x: selected.x, y: selected.y }
  }

  /**
   * Gets all positions with significant probability
   */
  getSignificantPositions(threshold = 0.01): { x: number; y: number; probability: number }[] {
    const positions: { x: number; y: number; probability: number }[] = []

    // Only check cells that might have significant amplitude
    for (let y = 0; y < this._height; y++) {
      for (let x = 0; x < this._width; x++) {
        // Quick check if amplitude is zero
        const amp = this._amplitudes[y][x]
        if (amp.real === 0 && amp.imag === 0) continue

        const probability = this.getProbability(x, y)
        if (probability >= threshold) {
          positions.push({ x, y, probability })
        }
      }
    }

    // Only sort if we have more than a few positions
    if (positions.length > 5) {
      return positions.sort((a, b) => b.probability - a.probability)
    }

    return positions
  }
}

