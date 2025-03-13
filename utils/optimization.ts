/**
 * Adam optimizer state
 */
export interface AdamState {
  m: number[]
  v: number[]
  t: number
}

/**
 * Adam optimizer configuration
 */
export interface AdamConfig {
  learningRate: number
  beta1: number
  beta2: number
  epsilon: number
}

/**
 * Adam optimizer for quantum-friendly optimization
 */
export class AdamOptimizer {
  private _config: AdamConfig
  private _state: AdamState

  /**
   * Creates a new Adam optimizer
   * @param numParameters Number of parameters to optimize
   * @param config Optimizer configuration
   */
  constructor(numParameters: number, config: Partial<AdamConfig> = {}) {
    this._config = {
      learningRate: config.learningRate ?? 0.001,
      beta1: config.beta1 ?? 0.9,
      beta2: config.beta2 ?? 0.999,
      epsilon: config.epsilon ?? 1e-8,
    }

    this._state = {
      m: Array(numParameters).fill(0),
      v: Array(numParameters).fill(0),
      t: 0,
    }
  }

  /**
   * Gets the optimizer configuration
   */
  get config(): AdamConfig {
    return { ...this._config }
  }

  /**
   * Gets the optimizer state
   */
  get state(): AdamState {
    return {
      m: [...this._state.m],
      v: [...this._state.v],
      t: this._state.t,
    }
  }

  /**
   * Sets the optimizer state
   */
  set state(state: AdamState) {
    this._state = {
      m: [...state.m],
      v: [...state.v],
      t: state.t,
    }
  }

  /**
   * Updates parameters using gradients
   * @param parameters Current parameters
   * @param gradients Gradients for each parameter
   * @returns Updated parameters
   */
  update(parameters: number[], gradients: number[]): number[] {
    if (parameters.length !== gradients.length) {
      throw new Error(`Expected ${parameters.length} gradients, got ${gradients.length}`)
    }

    const { learningRate, beta1, beta2, epsilon } = this._config
    const { m, v } = this._state

    // Increment timestep
    this._state.t += 1
    const t = this._state.t

    // Update parameters
    const newParameters = [...parameters]

    for (let i = 0; i < parameters.length; i++) {
      // Update biased first moment estimate
      m[i] = beta1 * m[i] + (1 - beta1) * gradients[i]

      // Update biased second raw moment estimate
      v[i] = beta2 * v[i] + (1 - beta2) * gradients[i] * gradients[i]

      // Compute bias-corrected first moment estimate
      const mHat = m[i] / (1 - Math.pow(beta1, t))

      // Compute bias-corrected second raw moment estimate
      const vHat = v[i] / (1 - Math.pow(beta2, t))

      // Update parameters
      newParameters[i] = parameters[i] - (learningRate * mHat) / (Math.sqrt(vHat) + epsilon)
    }

    return newParameters
  }

  /**
   * Resets the optimizer state
   */
  reset(): void {
    this._state.m.fill(0)
    this._state.v.fill(0)
    this._state.t = 0
  }
}

/**
 * Learning rate scheduler interface
 */
export interface LearningRateScheduler {
  /**
   * Gets the learning rate for the current epoch
   * @param epoch Current epoch
   * @param initialLearningRate Initial learning rate
   * @returns Learning rate for the current epoch
   */
  getLearningRate(epoch: number, initialLearningRate: number): number
}

/**
 * Exponential decay learning rate scheduler
 */
export class ExponentialDecayScheduler implements LearningRateScheduler {
  private _decayRate: number
  private _decaySteps: number

  /**
   * Creates a new exponential decay scheduler
   * @param decayRate Rate of decay
   * @param decaySteps Number of steps for decay
   */
  constructor(decayRate = 0.9, decaySteps = 1) {
    this._decayRate = decayRate
    this._decaySteps = decaySteps
  }

  /**
   * Gets the learning rate for the current epoch
   * @param epoch Current epoch
   * @param initialLearningRate Initial learning rate
   * @returns Learning rate for the current epoch
   */
  getLearningRate(epoch: number, initialLearningRate: number): number {
    return initialLearningRate * Math.pow(this._decayRate, Math.floor(epoch / this._decaySteps))
  }
}

/**
 * Step decay learning rate scheduler
 */
export class StepDecayScheduler implements LearningRateScheduler {
  private _dropRate: number
  private _epochsDrop: number

  /**
   * Creates a new step decay scheduler
   * @param dropRate Rate to drop learning rate
   * @param epochsDrop Number of epochs between drops
   */
  constructor(dropRate = 0.5, epochsDrop = 10) {
    this._dropRate = dropRate
    this._epochsDrop = epochsDrop
  }

  /**
   * Gets the learning rate for the current epoch
   * @param epoch Current epoch
   * @param initialLearningRate Initial learning rate
   * @returns Learning rate for the current epoch
   */
  getLearningRate(epoch: number, initialLearningRate: number): number {
    return initialLearningRate * Math.pow(this._dropRate, Math.floor(epoch / this._epochsDrop))
  }
}

