import { Qubit } from "./qubit"
import type { QuantumGate } from "./quantum-gates"
import { type Complex, ONE, ZERO } from "../utils/complex-utils"

/**
 * Represents a quantum circuit with multiple qubits and gates
 */
export class QuantumCircuit {
  private _qubits: Qubit[]
  private _operations: { gate: QuantumGate; qubits: number[] }[]

  /**
   * Creates a new quantum circuit with the specified number of qubits
   * @param numQubits Number of qubits in the circuit
   */
  constructor(numQubits = 1) {
    this._qubits = Array(numQubits)
      .fill(0)
      .map(() => new Qubit())
    this._operations = []
  }

  /**
   * Gets the number of qubits in the circuit
   */
  get numQubits(): number {
    return this._qubits.length
  }

  /**
   * Gets a copy of the qubits in the circuit
   */
  get qubits(): Qubit[] {
    return this._qubits.map((q) => q.clone())
  }

  /**
   * Gets the operations in the circuit
   */
  get operations(): { gate: QuantumGate; qubits: number[] }[] {
    return [...this._operations]
  }

  /**
   * Resets all qubits to |0⟩ state
   */
  reset(): void {
    this._qubits.forEach((qubit) => qubit.setState(ONE, ZERO))
    this._operations = []
  }

  /**
   * Initializes a qubit to a specific state
   * @param index Index of the qubit to initialize
   * @param alpha Amplitude for |0⟩ state
   * @param beta Amplitude for |1⟩ state
   */
  initialize(index: number, alpha: Complex, beta: Complex): void {
    if (index < 0 || index >= this._qubits.length) {
      throw new Error(`Invalid qubit index: ${index}`)
    }

    this._qubits[index].setState(alpha, beta)
  }

  /**
   * Adds a gate operation to the circuit
   * @param gate The quantum gate to apply
   * @param qubits Indices of qubits to apply the gate to
   */
  addGate(gate: QuantumGate, qubits: number[]): void {
    if (qubits.length !== gate.numQubits) {
      throw new Error(`Gate ${gate.name} requires ${gate.numQubits} qubits, but ${qubits.length} were provided`)
    }

    // Validate qubit indices
    qubits.forEach((index) => {
      if (index < 0 || index >= this._qubits.length) {
        throw new Error(`Invalid qubit index: ${index}`)
      }
    })

    this._operations.push({ gate, qubits })
  }

  /**
   * Executes the circuit by applying all gates in sequence
   */
  execute(): void {
    for (const op of this._operations) {
      const targetQubits = op.qubits.map((index) => this._qubits[index])
      op.gate.apply(targetQubits)
    }
  }

  /**
   * Measures the specified qubit
   * @param index Index of the qubit to measure
   * @returns Measurement result (0 or 1)
   */
  measure(index: number): number {
    if (index < 0 || index >= this._qubits.length) {
      throw new Error(`Invalid qubit index: ${index}`)
    }

    return this._qubits[index].measure()
  }

  /**
   * Measures all qubits in the circuit
   * @returns Array of measurement results (0s and 1s)
   */
  measureAll(): number[] {
    return this._qubits.map((qubit) => qubit.measure())
  }

  /**
   * Creates a copy of this circuit
   */
  clone(): QuantumCircuit {
    const circuit = new QuantumCircuit(this.numQubits)

    // Copy qubit states
    for (let i = 0; i < this.numQubits; i++) {
      circuit._qubits[i].setState(this._qubits[i].alpha, this._qubits[i].beta)
    }

    // Copy operations
    circuit._operations = [...this._operations]

    return circuit
  }

  /**
   * Returns a string representation of the circuit
   */
  toString(): string {
    let result = `Quantum Circuit with ${this.numQubits} qubits:\n`

    for (let i = 0; i < this.numQubits; i++) {
      result += `Qubit ${i}: ${this._qubits[i].toString()}\n`
    }

    result += `Operations: ${this._operations.length}\n`
    this._operations.forEach((op, i) => {
      result += `  ${i}: ${op.gate.name} on qubits [${op.qubits.join(", ")}]\n`
    })

    return result
  }
}

