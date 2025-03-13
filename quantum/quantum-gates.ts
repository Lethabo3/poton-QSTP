import { complex, multiply, add, scale, type ComplexMatrix, ZERO, ONE, I } from "../utils/complex-utils"
import type { Qubit } from "./qubit"

/**
 * Interface for quantum gates
 */
export interface QuantumGate {
  /**
   * Name of the gate
   */
  name: string

  /**
   * Number of qubits this gate operates on
   */
  numQubits: number

  /**
   * Matrix representation of the gate
   */
  matrix: ComplexMatrix

  /**
   * Apply the gate to the given qubit(s)
   */
  apply(qubits: Qubit[]): void

  /**
   * Creates a parameterized version of this gate if applicable
   */
  withParams?(...params: number[]): QuantumGate
}

/**
 * Base class for single-qubit gates
 */
abstract class SingleQubitGate implements QuantumGate {
  abstract name: string
  numQubits = 1
  abstract matrix: ComplexMatrix

  apply(qubits: Qubit[]): void {
    if (qubits.length !== 1) {
      throw new Error(`${this.name} gate requires exactly 1 qubit`)
    }

    const qubit = qubits[0]
    const newAlpha = add(multiply(this.matrix[0][0], qubit.alpha), multiply(this.matrix[0][1], qubit.beta))

    const newBeta = add(multiply(this.matrix[1][0], qubit.alpha), multiply(this.matrix[1][1], qubit.beta))

    qubit.setState(newAlpha, newBeta)
  }
}

/**
 * Hadamard gate: Creates superposition
 */
export class HadamardGate extends SingleQubitGate {
  name = "H"
  matrix: ComplexMatrix = [
    [scale(ONE, 1 / Math.sqrt(2)), scale(ONE, 1 / Math.sqrt(2))],
    [scale(ONE, 1 / Math.sqrt(2)), scale(ONE, -1 / Math.sqrt(2))],
  ]
}

/**
 * Pauli-X gate: Bit flip (quantum NOT gate)
 */
export class PauliXGate extends SingleQubitGate {
  name = "X"
  matrix: ComplexMatrix = [
    [ZERO, ONE],
    [ONE, ZERO],
  ]
}

/**
 * Pauli-Y gate: Rotation around Y-axis
 */
export class PauliYGate extends SingleQubitGate {
  name = "Y"
  matrix: ComplexMatrix = [
    [ZERO, scale(I, -1)],
    [I, ZERO],
  ]
}

/**
 * Pauli-Z gate: Phase flip
 */
export class PauliZGate extends SingleQubitGate {
  name = "Z"
  matrix: ComplexMatrix = [
    [ONE, ZERO],
    [ZERO, scale(ONE, -1)],
  ]
}

/**
 * Phase gate (S gate): Rotates by 90 degrees around Z-axis
 */
export class PhaseGate extends SingleQubitGate {
  name = "S"
  matrix: ComplexMatrix = [
    [ONE, ZERO],
    [ZERO, I],
  ]
}

/**
 * T gate: Rotates by 45 degrees around Z-axis
 */
export class TGate extends SingleQubitGate {
  name = "T"
  matrix: ComplexMatrix = [
    [ONE, ZERO],
    [ZERO, complex(Math.cos(Math.PI / 4), Math.sin(Math.PI / 4))],
  ]
}

/**
 * Rotation gate around X-axis
 */
export class RXGate extends SingleQubitGate {
  name = "RX"
  private _theta: number
  matrix: ComplexMatrix

  constructor(theta = 0) {
    super()
    this._theta = theta
    this.updateMatrix()
  }

  private updateMatrix(): void {
    const cos = Math.cos(this._theta / 2)
    const sin = Math.sin(this._theta / 2)

    this.matrix = [
      [complex(cos, 0), complex(0, -sin)],
      [complex(0, -sin), complex(cos, 0)],
    ]
  }

  withParams(theta: number): QuantumGate {
    return new RXGate(theta)
  }
}

/**
 * Rotation gate around Y-axis
 */
export class RYGate extends SingleQubitGate {
  name = "RY"
  private _theta: number
  matrix: ComplexMatrix

  constructor(theta = 0) {
    super()
    this._theta = theta
    this.updateMatrix()
  }

  private updateMatrix(): void {
    const cos = Math.cos(this._theta / 2)
    const sin = Math.sin(this._theta / 2)

    this.matrix = [
      [complex(cos, 0), complex(-sin, 0)],
      [complex(sin, 0), complex(cos, 0)],
    ]
  }

  withParams(theta: number): QuantumGate {
    return new RYGate(theta)
  }
}

/**
 * Rotation gate around Z-axis
 */
export class RZGate extends SingleQubitGate {
  name = "RZ"
  private _theta: number
  matrix: ComplexMatrix

  constructor(theta = 0) {
    super()
    this._theta = theta
    this.updateMatrix()
  }

  private updateMatrix(): void {
    const phase = this._theta / 2

    this.matrix = [
      [complex(Math.cos(phase), -Math.sin(phase)), ZERO],
      [ZERO, complex(Math.cos(phase), Math.sin(phase))],
    ]
  }

  withParams(theta: number): QuantumGate {
    return new RZGate(theta)
  }
}

/**
 * Base class for multi-qubit gates
 */
abstract class MultiQubitGate implements QuantumGate {
  abstract name: string
  abstract numQubits: number
  abstract matrix: ComplexMatrix

  abstract apply(qubits: Qubit[]): void
}

/**
 * CNOT (Controlled-NOT) gate: Flips the target qubit if control qubit is |1⟩
 */
export class CNOTGate extends MultiQubitGate {
  name = "CNOT"
  numQubits = 2
  matrix: ComplexMatrix = [
    [ONE, ZERO, ZERO, ZERO],
    [ZERO, ONE, ZERO, ZERO],
    [ZERO, ZERO, ZERO, ONE],
    [ZERO, ZERO, ONE, ZERO],
  ]

  apply(qubits: Qubit[]): void {
    if (qubits.length !== 2) {
      throw new Error("CNOT gate requires exactly 2 qubits")
    }

    const control = qubits[0]
    const target = qubits[1]

    // Only apply X gate to target if control is in |1⟩ state
    if (control.probabilityOne() > 0) {
      // We need to handle the case where control is in superposition
      const p1 = control.probabilityOne()

      // Calculate new amplitudes for target qubit
      const newAlpha = complex(
        target.alpha.real * (1 - p1) + target.beta.real * p1,
        target.alpha.imag * (1 - p1) + target.beta.imag * p1,
      )

      const newBeta = complex(
        target.beta.real * (1 - p1) + target.alpha.real * p1,
        target.beta.imag * (1 - p1) + target.alpha.imag * p1,
      )

      target.setState(newAlpha, newBeta)
    }
  }
}

/**
 * CZ (Controlled-Z) gate: Applies Z gate to target if control is |1⟩
 */
export class CZGate extends MultiQubitGate {
  name = "CZ"
  numQubits = 2
  matrix: ComplexMatrix = [
    [ONE, ZERO, ZERO, ZERO],
    [ZERO, ONE, ZERO, ZERO],
    [ZERO, ZERO, ONE, ZERO],
    [ZERO, ZERO, ZERO, scale(ONE, -1)],
  ]

  apply(qubits: Qubit[]): void {
    if (qubits.length !== 2) {
      throw new Error("CZ gate requires exactly 2 qubits")
    }

    const control = qubits[0]
    const target = qubits[1]

    // Only apply Z gate to target if control is in |1⟩ state
    if (control.probabilityOne() > 0) {
      // We need to handle the case where control is in superposition
      const p1 = control.probabilityOne()

      // Apply phase flip to |1⟩ component of target qubit
      const newBeta = scale(target.beta, complex(1 - 2 * p1, 0))
      target.setState(target.alpha, newBeta)
    }
  }
}

/**
 * SWAP gate: Swaps the states of two qubits
 */
export class SWAPGate extends MultiQubitGate {
  name = "SWAP"
  numQubits = 2
  matrix: ComplexMatrix = [
    [ONE, ZERO, ZERO, ZERO],
    [ZERO, ZERO, ONE, ZERO],
    [ZERO, ONE, ZERO, ZERO],
    [ZERO, ZERO, ZERO, ONE],
  ]

  apply(qubits: Qubit[]): void {
    if (qubits.length !== 2) {
      throw new Error("SWAP gate requires exactly 2 qubits")
    }

    const q1 = qubits[0]
    const q2 = qubits[1]

    // Swap the amplitudes
    const tempAlpha = q1.alpha
    const tempBeta = q1.beta

    q1.setState(q2.alpha, q2.beta)
    q2.setState(tempAlpha, tempBeta)
  }
}

// Create instances of common gates
export const H = new HadamardGate()
export const X = new PauliXGate()
export const Y = new PauliYGate()
export const Z = new PauliZGate()
export const S = new PhaseGate()
export const T = new TGate()
export const CNOT = new CNOTGate()
export const CZ = new CZGate()
export const SWAP = new SWAPGate()

// Parameterized rotation gates
export const RX = (theta: number) => new RXGate(theta)
export const RY = (theta: number) => new RYGate(theta)
export const RZ = (theta: number) => new RZGate(theta)

