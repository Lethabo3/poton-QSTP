import { type Complex, scale, magnitude, ZERO, ONE } from "../utils/complex-utils"

/**
 * Represents a quantum bit (qubit) with complex amplitudes
 */
export class Qubit {
  // Amplitude for |0⟩ state
  private _alpha: Complex

  // Amplitude for |1⟩ state
  private _beta: Complex

  /**
   * Creates a new qubit
   * @param alpha Amplitude for |0⟩ state
   * @param beta Amplitude for |1⟩ state
   */
  constructor(alpha: Complex = ONE, beta: Complex = ZERO) {
    this._alpha = alpha
    this._beta = beta
    this.normalize()
  }

  /**
   * Gets the amplitude for |0⟩ state
   */
  get alpha(): Complex {
    return this._alpha
  }

  /**
   * Gets the amplitude for |1⟩ state
   */
  get beta(): Complex {
    return this._beta
  }

  /**
   * Sets the amplitudes and normalizes the state
   */
  setState(alpha: Complex, beta: Complex): void {
    this._alpha = alpha
    this._beta = beta
    this.normalize()
  }

  /**
   * Normalizes the qubit state to ensure total probability is 1
   */
  normalize(): void {
    const norm = Math.sqrt(magnitude(this._alpha) ** 2 + magnitude(this._beta) ** 2)

    if (norm > 0) {
      this._alpha = scale(this._alpha, 1 / norm)
      this._beta = scale(this._beta, 1 / norm)
    }
  }

  /**
   * Calculates the probability of measuring |0⟩
   */
  probabilityZero(): number {
    return magnitude(this._alpha) ** 2
  }

  /**
   * Calculates the probability of measuring |1⟩
   */
  probabilityOne(): number {
    return magnitude(this._beta) ** 2
  }

  /**
   * Performs a measurement on the qubit, collapsing it to |0⟩ or |1⟩
   * @returns 0 or 1 based on measurement probabilities
   */
  measure(): number {
    const p0 = this.probabilityZero()
    const random = Math.random()

    if (random < p0) {
      // Collapse to |0⟩
      this.setState(ONE, ZERO)
      return 0
    } else {
      // Collapse to |1⟩
      this.setState(ZERO, ONE)
      return 1
    }
  }

  /**
   * Creates a copy of this qubit
   */
  clone(): Qubit {
    return new Qubit(this._alpha, this._beta)
  }

  /**
   * Returns a string representation of the qubit
   */
  toString(): string {
    return `(${this._alpha.real.toFixed(3)}+${this._alpha.imag.toFixed(3)}i)|0⟩ + (${this._beta.real.toFixed(3)}+${this._beta.imag.toFixed(3)}i)|1⟩`
  }
}

