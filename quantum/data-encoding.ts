import type { QuantumCircuit } from "./quantum-circuit"
import { RX, RY, H } from "./quantum-gates"
import { complex } from "../utils/complex-utils"

/**
 * Methods for encoding classical data into quantum states
 */
export class DataEncoding {
  /**
   * Encodes data using angle encoding (mapping features to rotation angles)
   * @param circuit Quantum circuit to encode data into
   * @param data Array of feature values to encode
   * @param qubits Array of qubit indices to use for encoding
   * @param scaling Optional scaling factor for the data (default: π)
   */
  static angleEncoding(circuit: QuantumCircuit, data: number[], qubits: number[], scaling: number = Math.PI): void {
    if (data.length > qubits.length) {
      throw new Error("Not enough qubits for angle encoding")
    }

    // Apply Hadamard to create superposition
    qubits.forEach((q) => circuit.addGate(H, [q]))

    // Encode data using rotation gates
    for (let i = 0; i < data.length; i++) {
      const normalizedValue = data[i] * scaling
      circuit.addGate(RY(normalizedValue), [qubits[i]])
    }
  }

  /**
   * Encodes data using amplitude encoding (encoding in probability amplitudes)
   * @param circuit Quantum circuit to encode data into
   * @param data Array of feature values to encode
   * @param qubits Array of qubit indices to use for encoding
   */
  static amplitudeEncoding(circuit: QuantumCircuit, data: number[], qubits: number[]): void {
    const numQubits = qubits.length
    const maxDimension = 1 << numQubits // 2^numQubits

    if (data.length > maxDimension) {
      throw new Error(`Cannot encode ${data.length} values with ${numQubits} qubits`)
    }

    // Normalize the data
    let norm = 0
    for (const value of data) {
      norm += value * value
    }
    norm = Math.sqrt(norm)

    if (norm === 0) {
      throw new Error("Data vector cannot be all zeros")
    }

    const normalizedData = data.map((value) => value / norm)

    // Pad with zeros if needed
    while (normalizedData.length < maxDimension) {
      normalizedData.push(0)
    }

    // Reset the circuit
    circuit.reset()

    // Set the amplitudes directly
    // Note: This is a simplified approach. In a real quantum computer,
    // we would need to construct a circuit that prepares this state.
    for (let i = 0; i < maxDimension; i++) {
      const binaryString = i.toString(2).padStart(numQubits, "0")
      let index = 0

      // Map the binary string to the correct qubit indices
      for (let j = 0; j < numQubits; j++) {
        if (binaryString[numQubits - 1 - j] === "1") {
          index |= 1 << qubits[j]
        }
      }

      // Set the amplitude
      circuit.initialize(index, complex(normalizedData[i], 0), complex(0, 0))
    }
  }

  /**
   * Encodes binary data using basis encoding
   * @param circuit Quantum circuit to encode data into
   * @param data Array of binary values (0 or 1) to encode
   * @param qubits Array of qubit indices to use for encoding
   */
  static basisEncoding(circuit: QuantumCircuit, data: number[], qubits: number[]): void {
    if (data.length > qubits.length) {
      throw new Error("Not enough qubits for basis encoding")
    }

    // Reset the circuit
    circuit.reset()

    // Apply X gates to qubits that should be in |1⟩ state
    for (let i = 0; i < data.length; i++) {
      if (data[i] === 1) {
        circuit.addGate(RX(Math.PI), [qubits[i]]) // RX(π) is equivalent to X gate
      } else if (data[i] !== 0) {
        throw new Error("Basis encoding requires binary data (0 or 1)")
      }
    }
  }
}

