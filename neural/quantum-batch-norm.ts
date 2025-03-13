import { type Complex, magnitude, complex } from "../utils/complex-utils"

/**
 * Implements quantum-inspired batch normalization to stabilize and
 * accelerate training of quantum neural networks
 */
export class QuantumBatchNorm {
  private _dimension: number
  private _epsilon: number
  private _momentum: number
  private _gamma: number[]
  private _beta: number[]
  private _runningMean: number[]
  private _runningVar: number[]
  private _isTraining: boolean

  /**
   * Creates a new quantum batch normalization layer
   * @param dimension Dimension of the input data
   * @param epsilon Small constant for numerical stability
   * @param momentum Momentum for running statistics
   */
  constructor(dimension: number, epsilon = 1e-5, momentum = 0.9) {
    this._dimension = dimension
    this._epsilon = epsilon
    this._momentum = momentum

    // Learnable parameters
    this._gamma = Array(dimension).fill(1) // Scale
    this._beta = Array(dimension).fill(0) // Shift

    // Running statistics for inference
    this._runningMean = Array(dimension).fill(0)
    this._runningVar = Array(dimension).fill(1)

    this._isTraining = true
  }

  /**
   * Gets all parameters of the batch normalization
   */
  get parameters(): number[] {
    return [...this._gamma, ...this._beta]
  }

  /**
   * Sets all parameters of the batch normalization
   */
  set parameters(params: number[]) {
    if (params.length !== this._dimension * 2) {
      throw new Error(`Expected ${this._dimension * 2} parameters, got ${params.length}`)
    }

    this._gamma = params.slice(0, this._dimension)
    this._beta = params.slice(this._dimension)
  }

  /**
   * Gets the number of parameters
   */
  get numParameters(): number {
    return this._dimension * 2
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
   * Normalizes a batch of quantum amplitudes
   * @param batch Batch of quantum amplitudes
   * @returns Normalized batch
   */
  normalizeQuantumBatch(batch: Complex[][]): Complex[][] {
    if (batch.length === 0) {
      return []
    }

    if (batch[0].length !== this._dimension) {
      throw new Error(`Expected ${this._dimension} dimensions, got ${batch[0].length}`)
    }

    // Calculate batch statistics
    const batchSize = batch.length
    const batchMean: number[] = Array(this._dimension).fill(0)
    const batchVar: number[] = Array(this._dimension).fill(0)

    // Calculate mean of magnitudes
    for (let i = 0; i < batchSize; i++) {
      for (let j = 0; j < this._dimension; j++) {
        batchMean[j] += magnitude(batch[i][j])
      }
    }

    for (let j = 0; j < this._dimension; j++) {
      batchMean[j] /= batchSize
    }

    // Calculate variance of magnitudes
    for (let i = 0; i < batchSize; i++) {
      for (let j = 0; j < this._dimension; j++) {
        const diff = magnitude(batch[i][j]) - batchMean[j]
        batchVar[j] += diff * diff
      }
    }

    for (let j = 0; j < this._dimension; j++) {
      batchVar[j] /= batchSize
    }

    // Update running statistics if in training mode
    if (this._isTraining) {
      for (let j = 0; j < this._dimension; j++) {
        this._runningMean[j] = this._momentum * this._runningMean[j] + (1 - this._momentum) * batchMean[j]
        this._runningVar[j] = this._momentum * this._runningVar[j] + (1 - this._momentum) * batchVar[j]
      }
    }

    // Use appropriate statistics based on mode
    const mean = this._isTraining ? batchMean : this._runningMean
    const variance = this._isTraining ? batchVar : this._runningVar

    // Normalize and apply scale and shift
    const normalized: Complex[][] = []

    for (let i = 0; i < batchSize; i++) {
      const normalizedSample: Complex[] = []

      for (let j = 0; j < this._dimension; j++) {
        const mag = magnitude(batch[i][j])
        const phase = Math.atan2(batch[i][j].imag, batch[i][j].real)

        // Normalize magnitude
        const normalizedMag = (mag - mean[j]) / Math.sqrt(variance[j] + this._epsilon)

        // Apply scale and shift
        const scaledMag = normalizedMag * this._gamma[j] + this._beta[j]

        // Reconstruct complex number with normalized magnitude and original phase
        normalizedSample.push(complex(scaledMag * Math.cos(phase), scaledMag * Math.sin(phase)))
      }

      normalized.push(normalizedSample)
    }

    return normalized
  }

  /**
   * Normalizes a batch of real-valued inputs
   * @param batch Batch of inputs
   * @returns Normalized batch
   */
  forward(batch: number[][]): number[][] {
    if (batch.length === 0) {
      return []
    }

    if (batch[0].length !== this._dimension) {
      throw new Error(`Expected ${this._dimension} dimensions, got ${batch[0].length}`)
    }

    // Calculate batch statistics
    const batchSize = batch.length
    const batchMean: number[] = Array(this._dimension).fill(0)
    const batchVar: number[] = Array(this._dimension).fill(0)

    // Calculate mean
    for (let i = 0; i < batchSize; i++) {
      for (let j = 0; j < this._dimension; j++) {
        batchMean[j] += batch[i][j]
      }
    }

    for (let j = 0; j < this._dimension; j++) {
      batchMean[j] /= batchSize
    }

    // Calculate variance
    for (let i = 0; i < batchSize; i++) {
      for (let j = 0; j < this._dimension; j++) {
        const diff = batch[i][j] - batchMean[j]
        batchVar[j] += diff * diff
      }
    }

    for (let j = 0; j < this._dimension; j++) {
      batchVar[j] /= batchSize
    }

    // Update running statistics if in training mode
    if (this._isTraining) {
      for (let j = 0; j < this._dimension; j++) {
        this._runningMean[j] = this._momentum * this._runningMean[j] + (1 - this._momentum) * batchMean[j]
        this._runningVar[j] = this._momentum * this._runningVar[j] + (1 - this._momentum) * batchVar[j]
      }
    }

    // Use appropriate statistics based on mode
    const mean = this._isTraining ? batchMean : this._runningMean
    const variance = this._isTraining ? batchVar : this._runningVar

    // Normalize and apply scale and shift
    const normalized: number[][] = []

    for (let i = 0; i < batchSize; i++) {
      const normalizedSample: number[] = []

      for (let j = 0; j < this._dimension; j++) {
        // Normalize
        const normalizedValue = (batch[i][j] - mean[j]) / Math.sqrt(variance[j] + this._epsilon)

        // Apply scale and shift
        normalizedSample.push(normalizedValue * this._gamma[j] + this._beta[j])
      }

      normalized.push(normalizedSample)
    }

    return normalized
  }

  /**
   * Normalizes a single input sample (for inference)
   * @param input Input sample
   * @returns Normalized sample
   */
  normalize(input: number[]): number[] {
    if (input.length !== this._dimension) {
      throw new Error(`Expected ${this._dimension} dimensions, got ${input.length}`)
    }

    const normalized: number[] = []

    for (let j = 0; j < this._dimension; j++) {
      // Normalize using running statistics
      const normalizedValue = (input[j] - this._runningMean[j]) / Math.sqrt(this._runningVar[j] + this._epsilon)

      // Apply scale and shift
      normalized.push(normalizedValue * this._gamma[j] + this._beta[j])
    }

    return normalized
  }

  /**
   * Calculates gradients for batch normalization parameters
   * @param inputs Batch of inputs
   * @param outputGradients Gradients of the loss with respect to outputs
   * @returns Gradients for gamma and beta parameters
   */
  calculateGradients(inputs: number[][], outputGradients: number[][]): number[] {
    if (inputs.length !== outputGradients.length) {
      throw new Error("Number of inputs must match number of output gradients")
    }

    const batchSize = inputs.length
    const gammaGradients: number[] = Array(this._dimension).fill(0)
    const betaGradients: number[] = Array(this._dimension).fill(0)

    // Calculate batch statistics
    const batchMean: number[] = Array(this._dimension).fill(0)
    const batchVar: number[] = Array(this._dimension).fill(0)

    // Calculate mean
    for (let i = 0; i < batchSize; i++) {
      for (let j = 0; j < this._dimension; j++) {
        batchMean[j] += inputs[i][j]
      }
    }

    for (let j = 0; j < this._dimension; j++) {
      batchMean[j] /= batchSize
    }

    // Calculate variance
    for (let i = 0; i < batchSize; i++) {
      for (let j = 0; j < this._dimension; j++) {
        const diff = inputs[i][j] - batchMean[j]
        batchVar[j] += diff * diff
      }
    }

    for (let j = 0; j < this._dimension; j++) {
      batchVar[j] /= batchSize
    }

    // Calculate normalized inputs (without gamma and beta)
    const normalizedInputs: number[][] = []

    for (let i = 0; i < batchSize; i++) {
      const normalizedSample: number[] = []

      for (let j = 0; j < this._dimension; j++) {
        normalizedSample.push((inputs[i][j] - batchMean[j]) / Math.sqrt(batchVar[j] + this._epsilon))
      }

      normalizedInputs.push(normalizedSample)
    }

    // Calculate gradients for gamma and beta
    for (let i = 0; i < batchSize; i++) {
      for (let j = 0; j < this._dimension; j++) {
        gammaGradients[j] += outputGradients[i][j] * normalizedInputs[i][j]
        betaGradients[j] += outputGradients[i][j]
      }
    }

    // Return concatenated gradients
    return [...gammaGradients, ...betaGradients]
  }

  /**
   * Creates a copy of this batch normalization layer
   */
  clone(): QuantumBatchNorm {
    const clone = new QuantumBatchNorm(this._dimension, this._epsilon, this._momentum)
    clone.parameters = this.parameters
    clone.training = this._isTraining

    // Copy running statistics
    clone._runningMean = [...this._runningMean]
    clone._runningVar = [...this._runningVar]

    return clone
  }
}

