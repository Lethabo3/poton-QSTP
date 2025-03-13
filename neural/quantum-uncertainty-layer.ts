/**
 * Implements Heisenberg Uncertainty-inspired regularization
 * This layer introduces a fundamental trade-off between precision in different network dimensions
 * based on quantum mechanical principles
 */
export class QuantumUncertaintyLayer {
  private _dimension: number
  private _uncertaintyConstant: number
  private _positionPrecision: number[]
  private _momentumPrecision: number[]
  private _adaptiveUncertainty: boolean
  private _uncertaintyHistory: number[][]

  constructor(dimension: number, uncertaintyConstant = 0.1, adaptiveUncertainty = true) {
    this._dimension = dimension
    this._uncertaintyConstant = uncertaintyConstant
    this._adaptiveUncertainty = adaptiveUncertainty

    // Initialize precision vectors
    this._positionPrecision = Array(dimension).fill(1.0)
    this._momentumPrecision = Array(dimension).fill(1.0)

    // Enforce Heisenberg uncertainty principle
    this._balancePrecisions()

    // Track uncertainty history for adaptation
    this._uncertaintyHistory = []
  }

  /**
   * Applies uncertainty principle to network activations
   * @param activations Input activations
   * @returns Modified activations with uncertainty effects
   */
  applyUncertainty(activations: number[]): number[] {
    if (activations.length !== this._dimension) {
      throw new Error(`Expected ${this._dimension} activations, got ${activations.length}`)
    }

    const modifiedActivations = [...activations]

    // Apply position precision (direct values)
    for (let i = 0; i < this._dimension; i++) {
      // Add noise inversely proportional to position precision
      const noise = (Math.random() * 2 - 1) * (1 / this._positionPrecision[i]) * this._uncertaintyConstant
      modifiedActivations[i] += noise
    }

    // Apply momentum precision (changes in values)
    if (this._uncertaintyHistory.length > 0) {
      const previousActivations = this._uncertaintyHistory[this._uncertaintyHistory.length - 1]

      for (let i = 0; i < this._dimension; i++) {
        // Calculate momentum (change in activation)
        const momentum = modifiedActivations[i] - previousActivations[i]

        // Apply momentum precision
        const momentumNoise = momentum * (1 / this._momentumPrecision[i]) * this._uncertaintyConstant
        modifiedActivations[i] += momentumNoise
      }
    }

    // Store current activations for next iteration
    this._uncertaintyHistory.push([...modifiedActivations])
    if (this._uncertaintyHistory.length > 10) {
      this._uncertaintyHistory.shift()
    }

    // Adapt uncertainty if enabled
    if (this._adaptiveUncertainty && this._uncertaintyHistory.length > 1) {
      this._adaptUncertainty()
    }

    return modifiedActivations
  }

  /**
   * Enforces Heisenberg uncertainty principle: position precision × momentum precision ≥ ħ/2
   * where ħ is our uncertainty constant
   */
  private _balancePrecisions(): void {
    for (let i = 0; i < this._dimension; i++) {
      const product = this._positionPrecision[i] * this._momentumPrecision[i]
      const minProduct = this._uncertaintyConstant / 2

      if (product < minProduct) {
        // Increase both precisions proportionally to maintain their ratio
        const factor = Math.sqrt(minProduct / product)
        this._positionPrecision[i] *= factor
        this._momentumPrecision[i] *= factor
      }
    }
  }

  /**
   * Adapts uncertainty based on recent activation patterns
   */
  private _adaptUncertainty(): void {
    // Calculate activation variances (position uncertainty)
    const variances = Array(this._dimension).fill(0)
    const means = Array(this._dimension).fill(0)

    // Calculate means
    for (let i = 0; i < this._dimension; i++) {
      for (const activations of this._uncertaintyHistory) {
        means[i] += activations[i]
      }
      means[i] /= this._uncertaintyHistory.length
    }

    // Calculate variances
    for (let i = 0; i < this._dimension; i++) {
      for (const activations of this._uncertaintyHistory) {
        variances[i] += Math.pow(activations[i] - means[i], 2)
      }
      variances[i] /= this._uncertaintyHistory.length
    }

    // Calculate momentum variances
    const momentumVariances = Array(this._dimension).fill(0)
    for (let i = 0; i < this._dimension; i++) {
      for (let j = 1; j < this._uncertaintyHistory.length; j++) {
        const momentum = this._uncertaintyHistory[j][i] - this._uncertaintyHistory[j - 1][i]
        momentumVariances[i] += momentum * momentum
      }
      momentumVariances[i] /= this._uncertaintyHistory.length - 1
    }

    // Update precisions based on observed uncertainties
    for (let i = 0; i < this._dimension; i++) {
      // Higher variance means lower precision
      this._positionPrecision[i] = 1.0 / (Math.sqrt(variances[i]) + 1e-6)
      this._momentumPrecision[i] = 1.0 / (Math.sqrt(momentumVariances[i]) + 1e-6)
    }

    // Re-enforce uncertainty principle
    this._balancePrecisions()
  }

  /**
   * Resets the uncertainty layer state
   */
  reset(): void {
    this._uncertaintyHistory = []

    // Reset precisions to default values
    this._positionPrecision = Array(this._dimension).fill(1.0)
    this._momentumPrecision = Array(this._dimension).fill(1.0)
    this._balancePrecisions()
  }
}

