import { type Complex, scale, ZERO } from "../utils/complex-utils"

/**
 * Implements quantum-inspired dropout for regularization in quantum neural networks
 */
export class QuantumDropout {
  private _dropProbability: number
  private _dropMask: boolean[] | null
  private _isTraining: boolean

  /**
   * Creates a new quantum dropout layer
   * @param dropProbability Probability of dropping a dimension
   */
  constructor(dropProbability = 0.2) {
    if (dropProbability < 0 || dropProbability >= 1) {
      throw new Error("Drop probability must be in range [0, 1)")
    }

    this._dropProbability = dropProbability
    this._dropMask = null
    this._isTraining = true
  }

  /**
   * Gets the drop probability
   */
  get dropProbability(): number {
    return this._dropProbability
  }

  /**
   * Sets the drop probability
   */
  set dropProbability(prob: number) {
    if (prob < 0 || prob >= 1) {
      throw new Error("Drop probability must be in range [0, 1)")
    }
    this._dropProbability = prob
  }

  /**
   * Sets the training mode
   */
  set training(isTraining: boolean) {
    this._isTraining = isTraining
  }

  /**
   * Gets the training mode
   */
  get training(): boolean {
    return this._isTraining
  }

  /**
   * Applies dropout to quantum amplitudes
   * @param amplitudes Array of complex amplitudes
   * @returns Amplitudes with dropout applied
   */
  applyToQuantumState(amplitudes: Complex[]): Complex[] {
    const dimension = amplitudes.length

    if (!this._isTraining) {
      return amplitudes
    }

    // Generate new drop mask
    this._dropMask = Array(dimension)
      .fill(false)
      .map(() => Math.random() < this._dropProbability)

    // Apply dropout and scale remaining values
    const scaleFactor = 1 / (1 - this._dropProbability)
    const result: Complex[] = []

    for (let i = 0; i < dimension; i++) {
      if (this._dropMask[i]) {
        result.push(ZERO)
      } else {
        result.push(scale(amplitudes[i], scaleFactor))
      }
    }

    return result
  }

  /**
   * Applies dropout to real-valued inputs
   * @param inputs Array of input values
   * @returns Inputs with dropout applied
   */
  forward(inputs: number[]): number[] {
    const dimension = inputs.length

    if (!this._isTraining) {
      return inputs
    }

    // Generate new drop mask
    this._dropMask = Array(dimension)
      .fill(false)
      .map(() => Math.random() < this._dropProbability)

    // Apply dropout and scale remaining values
    const scaleFactor = 1 / (1 - this._dropProbability)
    const result: number[] = []

    for (let i = 0; i < dimension; i++) {
      if (this._dropMask[i]) {
        result.push(0)
      } else {
        result.push(inputs[i] * scaleFactor)
      }
    }

    return result
  }

  /**
   * Applies dropout to a batch of inputs
   * @param batch Batch of inputs
   * @returns Batch with dropout applied
   */
  forwardBatch(batch: number[][]): number[][] {
    return batch.map((sample) => this.forward(sample))
  }

  /**
   * Creates a copy of this dropout layer
   */
  clone(): QuantumDropout {
    const clone = new QuantumDropout(this._dropProbability)
    clone.training = this._isTraining
    return clone
  }
}

