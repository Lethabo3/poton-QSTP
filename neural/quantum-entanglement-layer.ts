import { type Complex, complex } from "../utils/complex-utils"
import type { EnhancedQuantumNeuron } from "./enhanced-quantum-neuron"

/**
 * Implements quantum entanglement between neurons across different layers
 * This advanced mechanism allows information to "teleport" between distant parts of the network
 */
export class QuantumEntanglementLayer {
  private _entanglementMatrix: number[][]
  private _entangledNeurons: EnhancedQuantumNeuron[]
  private _entanglementStrength: number
  private _quantumMemory: Complex[]
  private _lastActivations: number[]
  private _teleportationProbability: number
  private _nonLocalityFactor: number

  constructor(
    neurons: EnhancedQuantumNeuron[],
    entanglementStrength = 0.2,
    teleportationProbability = 0.15,
    nonLocalityFactor = 0.3,
  ) {
    this._entangledNeurons = neurons
    this._entanglementStrength = entanglementStrength
    this._teleportationProbability = teleportationProbability
    this._nonLocalityFactor = nonLocalityFactor
    this._lastActivations = Array(neurons.length).fill(0)

    // Initialize quantum memory for entanglement
    this._quantumMemory = Array(neurons.length * 2)
      .fill(0)
      .map(() => complex(Math.random() * 0.1, Math.random() * 0.1))

    // Create entanglement matrix (which neurons are entangled with which)
    this._entanglementMatrix = []
    for (let i = 0; i < neurons.length; i++) {
      this._entanglementMatrix[i] = []
      for (let j = 0; j < neurons.length; j++) {
        // Create sparse entanglement (not all neurons are entangled)
        this._entanglementMatrix[i][j] = i !== j && Math.random() < 0.3 ? Math.random() * this._entanglementStrength : 0
      }
    }
  }

  /**
   * Apply quantum entanglement effects after forward pass
   * @param activations Current activations from neurons
   * @returns Modified activations with entanglement effects
   */
  applyEntanglement(activations: number[]): number[] {
    if (activations.length !== this._entangledNeurons.length) {
      throw new Error("Activation count must match neuron count")
    }

    // Store current activations
    this._lastActivations = [...activations]

    // Apply entanglement effects
    const entangledActivations = [...activations]

    // Update quantum memory based on activations
    for (let i = 0; i < activations.length; i++) {
      const phase = activations[i] * Math.PI
      const amplitude = Math.abs(activations[i])

      // Update quantum state
      this._quantumMemory[i] = complex(amplitude * Math.cos(phase), amplitude * Math.sin(phase))
    }

    // Apply quantum teleportation with probability
    if (Math.random() < this._teleportationProbability) {
      // Select random source and target neurons for teleportation
      const sourceIdx = Math.floor(Math.random() * activations.length)
      const targetIdx = Math.floor(Math.random() * activations.length)

      if (sourceIdx !== targetIdx) {
        // Quantum teleportation effect - transfer information between distant neurons
        const teleportStrength = this._nonLocalityFactor * Math.random()
        entangledActivations[targetIdx] =
          (1 - teleportStrength) * entangledActivations[targetIdx] + teleportStrength * activations[sourceIdx]
      }
    }

    // Apply entanglement matrix effects
    for (let i = 0; i < activations.length; i++) {
      for (let j = 0; j < activations.length; j++) {
        if (this._entanglementMatrix[i][j] > 0) {
          // Neurons i and j are entangled - affect each other's activations
          entangledActivations[i] +=
            this._entanglementMatrix[i][j] * (activations[j] - this._lastActivations[j]) * this._nonLocalityFactor
        }
      }

      // Ensure activations stay in valid range
      entangledActivations[i] = Math.max(-1, Math.min(1, entangledActivations[i]))
    }

    return entangledActivations
  }

  /**
   * Modifies gradients based on quantum entanglement during backpropagation
   * @param gradients Original gradients
   * @returns Modified gradients with entanglement effects
   */
  modifyGradients(gradients: number[]): number[] {
    const modifiedGradients = [...gradients]

    // Apply entanglement effects to gradients
    for (let i = 0; i < gradients.length; i++) {
      for (let j = 0; j < gradients.length; j++) {
        if (this._entanglementMatrix[i][j] > 0) {
          // Entangled neurons share gradient information
          modifiedGradients[i] += this._entanglementMatrix[i][j] * gradients[j] * this._nonLocalityFactor
        }
      }

      // Ensure gradients don't explode
      modifiedGradients[i] = Math.max(-5, Math.min(5, modifiedGradients[i]))
    }

    return modifiedGradients
  }

  /**
   * Updates the entanglement matrix based on learning
   * @param learningRate Rate at which entanglement adapts
   */
  updateEntanglement(learningRate: number): void {
    // Adapt entanglement based on activations
    for (let i = 0; i < this._entangledNeurons.length; i++) {
      for (let j = 0; j < this._entangledNeurons.length; j++) {
        if (i !== j && this._entanglementMatrix[i][j] > 0) {
          // Strengthen entanglement between correlated neurons
          const correlation = this._lastActivations[i] * this._lastActivations[j]
          this._entanglementMatrix[i][j] += learningRate * correlation * 0.01

          // Ensure entanglement stays in reasonable range
          this._entanglementMatrix[i][j] = Math.max(
            0,
            Math.min(this._entanglementStrength, this._entanglementMatrix[i][j]),
          )
        }
      }
    }
  }

  /**
   * Resets the quantum memory and entanglement state
   */
  reset(): void {
    this._lastActivations = Array(this._entangledNeurons.length).fill(0)

    // Reset quantum memory with small random values
    for (let i = 0; i < this._quantumMemory.length; i++) {
      this._quantumMemory[i] = complex(Math.random() * 0.01, Math.random() * 0.01)
    }
  }
}

