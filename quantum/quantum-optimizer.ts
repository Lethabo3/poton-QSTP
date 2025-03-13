import { QuantumCircuit } from "./quantum-circuit"
import { H, RY, RZ, CNOT } from "./quantum-gates"
import { PerformanceMonitor, measurePerformance } from "../utils/performance-monitor"
import { QuantumCache } from "../utils/quantum-cache"

/**
 * Optimization strategies for quantum neural networks
 */
export enum OptimizationStrategy {
  PARAMETER_SHIFT = "parameter-shift",
  FINITE_DIFFERENCE = "finite-difference",
  QUANTUM_NATURAL_GRADIENT = "quantum-natural-gradient",
  ADAPTIVE = "adaptive",
}

/**
 * Configuration for quantum optimization
 */
export interface QuantumOptimizerConfig {
  learningRate: number
  strategy: OptimizationStrategy
  momentum?: number
  beta1?: number
  beta2?: number
  epsilon?: number
  maxIterations?: number
  convergenceTolerance?: number
  useQuantumAcceleration?: boolean
  useCache?: boolean
  cacheSize?: number
}

/**
 * Optimizer for quantum neural networks
 */
export class QuantumOptimizer {
  private _config: Required<QuantumOptimizerConfig>
  private _gradientCache: QuantumCache<string, number[]>
  private _momentumState: number[] = []
  private _m: number[] = [] // First moment estimate (Adam)
  private _v: number[] = [] // Second moment estimate (Adam)
  private _t = 0 // Timestep (Adam)
  private _performanceMonitor = PerformanceMonitor.getInstance()

  /**
   * Creates a new quantum optimizer
   * @param config Optimizer configuration
   */
  constructor(config: QuantumOptimizerConfig) {
    this._config = {
      learningRate: config.learningRate,
      strategy: config.strategy,
      momentum: config.momentum ?? 0.9,
      beta1: config.beta1 ?? 0.9,
      beta2: config.beta2 ?? 0.999,
      epsilon: config.epsilon ?? 1e-8,
      maxIterations: config.maxIterations ?? 1000,
      convergenceTolerance: config.convergenceTolerance ?? 1e-6,
      useQuantumAcceleration: config.useQuantumAcceleration ?? false,
      useCache: config.useCache ?? true,
      cacheSize: config.cacheSize ?? 1000,
    }

    this._gradientCache = new QuantumCache(this._config.cacheSize, 60000) // 1 minute TTL
  }

  /**
   * Gets the optimizer configuration
   */
  get config(): Required<QuantumOptimizerConfig> {
    return { ...this._config }
  }

  /**
   * Initializes the optimizer state for a given number of parameters
   * @param numParameters Number of parameters to optimize
   */
  initialize(numParameters: number): void {
    this._momentumState = Array(numParameters).fill(0)
    this._m = Array(numParameters).fill(0)
    this._v = Array(numParameters).fill(0)
    this._t = 0
  }

  /**
   * Calculates gradients using the parameter-shift rule
   * @param parameters Current parameters
   * @param costFunction Function to evaluate the cost
   * @returns Gradients for each parameter
   */
  calculateGradients(parameters: number[], costFunction: (params: number[]) => number): number[] {
    return measurePerformance("QuantumOptimizer.calculateGradients", () => {
      if (this._config.useCache) {
        // Use cached gradients if available
        const cacheKey = JSON.stringify({
          params: parameters.map((p) => Math.round(p * 1000) / 1000), // Round to reduce cache misses
          strategy: this._config.strategy,
        })

        return this._gradientCache.getOrCompute(cacheKey, () => {
          return this._calculateGradientsInternal(parameters, costFunction)
        })
      }

      return this._calculateGradientsInternal(parameters, costFunction)
    })
  }

  /**
   * Internal method to calculate gradients based on the selected strategy
   */
  private _calculateGradientsInternal(parameters: number[], costFunction: (params: number[]) => number): number[] {
    switch (this._config.strategy) {
      case OptimizationStrategy.PARAMETER_SHIFT:
        return this._parameterShiftGradient(parameters, costFunction)
      case OptimizationStrategy.FINITE_DIFFERENCE:
        return this._finiteDifferenceGradient(parameters, costFunction)
      case OptimizationStrategy.QUANTUM_NATURAL_GRADIENT:
        return this._quantumNaturalGradient(parameters, costFunction)
      case OptimizationStrategy.ADAPTIVE:
        return this._adaptiveGradient(parameters, costFunction)
      default:
        return this._parameterShiftGradient(parameters, costFunction)
    }
  }

  /**
   * Calculates gradients using the parameter-shift rule
   */
  private _parameterShiftGradient(parameters: number[], costFunction: (params: number[]) => number): number[] {
    const gradients: number[] = []
    const shift = Math.PI / 2 // Standard shift for parameter-shift rule

    // Calculate original cost
    const originalCost = costFunction(parameters)

    // Calculate gradient for each parameter
    for (let i = 0; i < parameters.length; i++) {
      // Shift parameter forward
      const forwardParams = [...parameters]
      forwardParams[i] += shift
      const forwardCost = costFunction(forwardParams)

      // Shift parameter backward
      const backwardParams = [...parameters]
      backwardParams[i] -= shift
      const backwardCost = costFunction(backwardParams)

      // Calculate gradient using parameter-shift rule
      const gradient = (forwardCost - backwardCost) / (2 * Math.sin(shift))
      gradients.push(gradient)
    }

    return gradients
  }

  /**
   * Calculates gradients using finite difference approximation
   */
  private _finiteDifferenceGradient(parameters: number[], costFunction: (params: number[]) => number): number[] {
    const gradients: number[] = []
    const epsilon = 1e-4 // Small perturbation

    // Calculate original cost
    const originalCost = costFunction(parameters)

    // Calculate gradient for each parameter
    for (let i = 0; i < parameters.length; i++) {
      // Perturb parameter
      const perturbedParams = [...parameters]
      perturbedParams[i] += epsilon
      const perturbedCost = costFunction(perturbedParams)

      // Calculate gradient using finite difference
      const gradient = (perturbedCost - originalCost) / epsilon
      gradients.push(gradient)
    }

    return gradients
  }

  /**
   * Calculates gradients using quantum natural gradient
   * This is a simplified implementation of QNG
   */
  private _quantumNaturalGradient(parameters: number[], costFunction: (params: number[]) => number): number[] {
    // First get regular gradients
    const gradients = this._parameterShiftGradient(parameters, costFunction)

    // In a full implementation, we would calculate the quantum Fisher information matrix
    // and use it to precondition the gradients. For simplicity, we'll use an approximation.

    // Create a simple circuit to estimate parameter correlations
    const numQubits = Math.min(5, Math.ceil(Math.log2(parameters.length)))
    const circuit = new QuantumCircuit(numQubits)

    // Apply Hadamard to create superposition
    for (let q = 0; q < numQubits; q++) {
      circuit.addGate(H, [q])
    }

    // Apply parameterized rotations
    for (let i = 0; i < parameters.length && i < 2 ** numQubits; i++) {
      const qubitIndices = this._indexToQubits(i, numQubits)
      for (const q of qubitIndices) {
        circuit.addGate(RY(parameters[i % parameters.length]), [q])
        circuit.addGate(RZ(parameters[(i + 1) % parameters.length]), [q])
      }
    }

    // Create entanglement
    for (let q = 0; q < numQubits - 1; q++) {
      circuit.addGate(CNOT, [q, q + 1])
    }

    // Execute circuit
    circuit.execute()

    // Use measurement outcomes to approximate parameter correlations
    // This is a simplified approach - a real QNG would use more sophisticated methods
    const preconditionedGradients = [...gradients]

    // Apply preconditioning - in this simplified version, we just scale gradients
    // based on their position in the parameter vector
    for (let i = 0; i < gradients.length; i++) {
      const scale = 1.0 / (1.0 + 0.1 * (i % numQubits))
      preconditionedGradients[i] *= scale
    }

    return preconditionedGradients
  }

  /**
   * Converts an index to qubit indices
   */
  private _indexToQubits(index: number, numQubits: number): number[] {
    const qubits: number[] = []
    for (let q = 0; q < numQubits; q++) {
      if ((index & (1 << q)) !== 0) {
        qubits.push(q)
      }
    }
    return qubits.length > 0 ? qubits : [0] // Default to qubit 0 if no qubits selected
  }

  /**
   * Calculates gradients using an adaptive strategy
   * Chooses the best strategy based on problem characteristics
   */
  private _adaptiveGradient(parameters: number[], costFunction: (params: number[]) => number): number[] {
    // For small parameter vectors, use parameter-shift rule
    if (parameters.length < 10) {
      return this._parameterShiftGradient(parameters, costFunction)
    }

    // For medium parameter vectors, use finite difference (faster but less accurate)
    if (parameters.length < 50) {
      return this._finiteDifferenceGradient(parameters, costFunction)
    }

    // For large parameter vectors, use a hybrid approach
    // Sample a subset of parameters with parameter-shift and the rest with finite difference
    const gradients: number[] = []
    const samplingRate = 0.2 // 20% of parameters use parameter-shift

    for (let i = 0; i < parameters.length; i++) {
      if (Math.random() < samplingRate) {
        // Use parameter-shift for this parameter
        const shift = Math.PI / 2

        const forwardParams = [...parameters]
        forwardParams[i] += shift
        const forwardCost = costFunction(forwardParams)

        const backwardParams = [...parameters]
        backwardParams[i] -= shift
        const backwardCost = costFunction(backwardParams)

        const gradient = (forwardCost - backwardCost) / (2 * Math.sin(shift))
        gradients.push(gradient)
      } else {
        // Use finite difference for this parameter
        const epsilon = 1e-4
        const originalCost = costFunction(parameters)

        const perturbedParams = [...parameters]
        perturbedParams[i] += epsilon
        const perturbedCost = costFunction(perturbedParams)

        const gradient = (perturbedCost - originalCost) / epsilon
        gradients.push(gradient)
      }
    }

    return gradients
  }

  /**
   * Updates parameters using calculated gradients
   * @param parameters Current parameters
   * @param gradients Calculated gradients
   * @returns Updated parameters
   */
  updateParameters(parameters: number[], gradients: number[]): number[] {
    return measurePerformance("QuantumOptimizer.updateParameters", () => {
      if (parameters.length !== gradients.length) {
        throw new Error(`Parameter and gradient dimensions don't match: ${parameters.length} vs ${gradients.length}`)
      }

      // Update using Adam optimizer
      this._t += 1
      const updatedParameters = [...parameters]

      for (let i = 0; i < parameters.length; i++) {
        // Update biased first moment estimate
        this._m[i] = this._config.beta1 * this._m[i] + (1 - this._config.beta1) * gradients[i]

        // Update biased second raw moment estimate
        this._v[i] = this._config.beta2 * this._v[i] + (1 - this._config.beta2) * gradients[i] * gradients[i]

        // Compute bias-corrected first moment estimate
        const mHat = this._m[i] / (1 - Math.pow(this._config.beta1, this._t))

        // Compute bias-corrected second raw moment estimate
        const vHat = this._v[i] / (1 - Math.pow(this._config.beta2, this._t))

        // Update parameters
        updatedParameters[i] -= (this._config.learningRate * mHat) / (Math.sqrt(vHat) + this._config.epsilon)
      }

      return updatedParameters
    })
  }

  /**
   * Optimizes parameters using the configured strategy
   * @param initialParameters Initial parameter values
   * @param costFunction Function to evaluate the cost
   * @param callback Optional callback for each iteration
   * @returns Optimized parameters
   */
  optimize(
    initialParameters: number[],
    costFunction: (params: number[]) => number,
    callback?: (iteration: number, parameters: number[], cost: number) => void,
  ): number[] {
    return measurePerformance("QuantumOptimizer.optimize", () => {
      // Initialize optimizer state
      this.initialize(initialParameters.length)

      let currentParameters = [...initialParameters]
      let previousCost = costFunction(currentParameters)
      let iteration = 0
      let converged = false

      while (iteration < this._config.maxIterations && !converged) {
        // Calculate gradients
        const gradients = this.calculateGradients(currentParameters, costFunction)

        // Update parameters
        currentParameters = this.updateParameters(currentParameters, gradients)

        // Calculate new cost
        const currentCost = costFunction(currentParameters)

        // Check for convergence
        const improvement = Math.abs(previousCost - currentCost)
        converged = improvement < this._config.convergenceTolerance

        // Update previous cost
        previousCost = currentCost

        // Call callback if provided
        if (callback) {
          callback(iteration, currentParameters, currentCost)
        }

        iteration++
      }

      return currentParameters
    })
  }

  /**
   * Gets cache statistics
   */
  getCacheStats(): { size: number; hits: number; misses: number; hitRate: number } {
    return this._gradientCache.getStats()
  }

  /**
   * Resets the optimizer state
   */
  reset(): void {
    this._momentumState = []
    this._m = []
    this._v = []
    this._t = 0
    this._gradientCache.clear()
  }
}

