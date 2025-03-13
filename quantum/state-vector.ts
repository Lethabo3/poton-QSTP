import { type Complex, add, scale, magnitude, ZERO, ONE } from "../utils/complex-utils"
import type { QuantumGate } from "./quantum-gates"

/**
 * Simulates a quantum system using the full state vector approach
 */
export class StateVector {
  private _numQubits: number
  private _stateVector: Complex[]

  /**
   * Creates a new state vector for the specified number of qubits
   * @param numQubits Number of qubits in the system
   */
  constructor(numQubits: number) {
    if (numQubits > 15) {
      throw new Error("StateVector simulator supports up to 15 qubits due to memory constraints")
    }

    this._numQubits = numQubits
    const dimension = 1 << numQubits // 2^numQubits

    // Initialize to |0...0⟩ state
    this._stateVector = Array(dimension).fill(ZERO)
    this._stateVector[0] = ONE
  }

  /**
   * Gets the number of qubits in the system
   */
  get numQubits(): number {
    return this._numQubits
  }

  /**
   * Gets the dimension of the state vector (2^numQubits)
   */
  get dimension(): number {
    return 1 << this._numQubits
  }

  /**
   * Gets a copy of the state vector
   */
  get stateVector(): Complex[] {
    return [...this._stateVector]
  }

  /**
   * Resets the state vector to |0...0⟩
   */
  reset(): void {
    this._stateVector = Array(this.dimension).fill(ZERO)
    this._stateVector[0] = ONE
  }

  /**
   * Sets the state vector to a specific state
   * @param stateVector New state vector (must be normalized)
   */
  setState(stateVector: Complex[]): void {
    if (stateVector.length !== this.dimension) {
      throw new Error(`State vector must have dimension ${this.dimension}`)
    }

    // Check normalization
    let norm = 0
    for (const amplitude of stateVector) {
      norm += magnitude(amplitude) ** 2
    }

    if (Math.abs(norm - 1) > 1e-10) {
      throw new Error("State vector must be normalized")
    }

    this._stateVector = [...stateVector]
  }

  /**
   * Applies a single-qubit gate to the specified qubit
   * @param gate Single-qubit gate to apply
   * @param qubitIndex Index of the qubit to apply the gate to
   */
  applySingleQubitGate(gate: QuantumGate, qubitIndex: number): void {
    if (gate.numQubits !== 1) {
      throw new Error(`Expected single-qubit gate, got ${gate.name} with ${gate.numQubits} qubits`)
    }

    if (qubitIndex < 0 || qubitIndex >= this._numQubits) {
      throw new Error(`Invalid qubit index: ${qubitIndex}`)
    }

    const newStateVector = Array(this.dimension).fill(ZERO)

    // For each basis state in the computational basis
    for (let i = 0; i < this.dimension; i++) {
      // Check if the target qubit is 0 or 1 in this basis state
      const bit = (i >> qubitIndex) & 1

      // Calculate the index with the target qubit flipped
      const flippedIndex = i ^ (1 << qubitIndex)

      if (bit === 0) {
        // |0⟩ component
        newStateVector[i] = add(newStateVector[i], scale(this._stateVector[i], gate.matrix[0][0]))
        newStateVector[flippedIndex] = add(newStateVector[flippedIndex], scale(this._stateVector[i], gate.matrix[1][0]))
      } else {
        // |1⟩ component
        newStateVector[flippedIndex] = add(newStateVector[flippedIndex], scale(this._stateVector[i], gate.matrix[0][1]))
        newStateVector[i] = add(newStateVector[i], scale(this._stateVector[i], gate.matrix[1][1]))
      }
    }

    this._stateVector = newStateVector
  }

  /**
   * Applies a two-qubit gate to the specified qubits
   * @param gate Two-qubit gate to apply
   * @param qubitIndices Indices of the qubits to apply the gate to
   */
  applyTwoQubitGate(gate: QuantumGate, qubitIndices: [number, number]): void {
    if (gate.numQubits !== 2) {
      throw new Error(`Expected two-qubit gate, got ${gate.name} with ${gate.numQubits} qubits`)
    }

    const [q1, q2] = qubitIndices

    if (q1 < 0 || q1 >= this._numQubits || q2 < 0 || q2 >= this._numQubits) {
      throw new Error(`Invalid qubit indices: ${q1}, ${q2}`)
    }

    if (q1 === q2) {
      throw new Error("Cannot apply two-qubit gate to the same qubit")
    }

    // Ensure q1 < q2 for consistency
    const [control, target] = q1 < q2 ? [q1, q2] : [q2, q1]

    const newStateVector = Array(this.dimension).fill(ZERO)

    // For each basis state in the computational basis
    for (let i = 0; i < this.dimension; i++) {
      // Extract the control and target bits
      const controlBit = (i >> control) & 1
      const targetBit = (i >> target) & 1

      // Calculate the 2-qubit state index (0-3)
      const stateIndex = (controlBit << 1) | targetBit

      // For each possible output state
      for (let j = 0; j < 4; j++) {
        const newControlBit = (j >> 1) & 1
        const newTargetBit = j & 1

        // Calculate the new basis state
        const newState = (i & ~((1 << control) | (1 << target))) | (newControlBit << control) | (newTargetBit << target)

        // Apply the gate matrix element
        newStateVector[newState] = add(
          newStateVector[newState],
          scale(this._stateVector[i], gate.matrix[stateIndex][j]),
        )
      }
    }

    this._stateVector = newStateVector
  }

  /**
   * Measures the specified qubit
   * @param qubitIndex Index of the qubit to measure
   * @returns Measurement result (0 or 1)
   */
  measure(qubitIndex: number): number {
    if (qubitIndex < 0 || qubitIndex >= this._numQubits) {
      throw new Error(`Invalid qubit index: ${qubitIndex}`)
    }

    // Calculate probability of measuring |1⟩
    let prob1 = 0
    for (let i = 0; i < this.dimension; i++) {
      if (((i >> qubitIndex) & 1) === 1) {
        prob1 += magnitude(this._stateVector[i]) ** 2
      }
    }

    // Determine measurement outcome
    const result = Math.random() < prob1 ? 1 : 0

    // Collapse the state vector
    const newStateVector = Array(this.dimension).fill(ZERO)
    let normalizationFactor = 0

    for (let i = 0; i < this.dimension; i++) {
      const bit = (i >> qubitIndex) & 1
      if (bit === result) {
        newStateVector[i] = this._stateVector[i]
        normalizationFactor += magnitude(this._stateVector[i]) ** 2
      }
    }

    // Normalize the new state vector
    normalizationFactor = Math.sqrt(normalizationFactor)
    for (let i = 0; i < this.dimension; i++) {
      newStateVector[i] = scale(newStateVector[i], 1 / normalizationFactor)
    }

    this._stateVector = newStateVector
    return result
  }

  /**
   * Measures all qubits in the system
   * @returns Array of measurement results (0s and 1s)
   */
  measureAll(): number[] {
    // Calculate probabilities for all basis states
    const probabilities: number[] = []
    for (let i = 0; i < this.dimension; i++) {
      probabilities[i] = magnitude(this._stateVector[i]) ** 2
    }

    // Choose a basis state based on probabilities
    const random = Math.random()
    let cumulativeProbability = 0
    let outcome = 0

    for (let i = 0; i < this.dimension; i++) {
      cumulativeProbability += probabilities[i]
      if (random < cumulativeProbability) {
        outcome = i
        break
      }
    }

    // Collapse the state vector
    this._stateVector = Array(this.dimension).fill(ZERO)
    this._stateVector[outcome] = ONE

    // Convert outcome to binary representation
    const results: number[] = []
    for (let i = 0; i < this._numQubits; i++) {
      results.push((outcome >> i) & 1)
    }

    return results
  }

  /**
   * Gets the probability of measuring a specific basis state
   * @param basisState Array of 0s and 1s representing the basis state
   * @returns Probability of measuring the specified basis state
   */
  getProbability(basisState: number[]): number {
    if (basisState.length !== this._numQubits) {
      throw new Error(`Basis state must have ${this._numQubits} qubits`)
    }

    // Convert basis state to index
    let index = 0
    for (let i = 0; i < this._numQubits; i++) {
      if (basisState[i] !== 0 && basisState[i] !== 1) {
        throw new Error(`Basis state must contain only 0s and 1s`)
      }
      index |= basisState[i] << i
    }

    return magnitude(this._stateVector[index]) ** 2
  }

  /**
   * Creates a copy of this state vector
   */
  clone(): StateVector {
    const stateVector = new StateVector(this._numQubits)
    stateVector._stateVector = [...this._stateVector]
    return stateVector
  }
}

