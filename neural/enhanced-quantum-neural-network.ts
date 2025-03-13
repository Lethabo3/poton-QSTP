import { EnhancedQuantumLayer, type EnhancedQuantumLayerConfig } from "./enhanced-quantum-layer"
import { QuantumOptimizer, OptimizationStrategy } from "../quantum/quantum-optimizer"
import { PerformanceMonitor, measurePerformance } from "../utils/performance-monitor"

export interface EnhancedQuantumNNConfig {
  inputSize: number
  layerSizes: number[]
  layerConfigs?: Omit<EnhancedQuantumLayerConfig, "inputSize" | "outputSize">[]
  useSkipConnections?: boolean
  useLearningRateScheduler?: boolean
  useGradientClipping?: boolean
  gradientClipValue?: number
  optimizationStrategy?: OptimizationStrategy
  useQuantumAcceleration?: boolean
  useCache?: boolean
}

export type LossFunction = (predictions: number[], targets: number[]) => number
export type GradientFunction = (predictions: number[], targets: number[]) => number[]

export const EnhancedLossFunctions = {
  MSE: {
    loss: (predictions: number[], targets: number[]): number => {
      let sum = 0
      for (let i = 0; i < predictions.length; i++) {
        const diff = predictions[i] - targets[i]
        sum += diff * diff
      }
      return sum / predictions.length
    },
    gradient: (predictions: number[], targets: number[]): number[] => {
      return predictions.map((pred, i) => (2 * (pred - targets[i])) / predictions.length)
    },
  },

  // Huber loss (more robust to outliers)
  Huber: {
    loss: (predictions: number[], targets: number[], delta = 1.0): number => {
      let sum = 0
      for (let i = 0; i < predictions.length; i++) {
        const diff = Math.abs(predictions[i] - targets[i])
        if (diff <= delta) {
          sum += 0.5 * diff * diff
        } else {
          sum += delta * (diff - 0.5 * delta)
        }
      }
      return sum / predictions.length
    },
    gradient: (predictions: number[], targets: number[], delta = 1.0): number[] => {
      return predictions.map((pred, i) => {
        const diff = pred - targets[i]
        const absDiff = Math.abs(diff)
        if (absDiff <= delta) {
          return diff / predictions.length
        } else {
          return (delta * Math.sign(diff)) / predictions.length
        }
      })
    },
  },

  // Cross-entropy loss for classification
  CrossEntropy: {
    loss: (predictions: number[], targets: number[]): number => {
      let sum = 0
      for (let i = 0; i < predictions.length; i++) {
        // Clip predictions to avoid log(0)
        const p = Math.max(Math.min(predictions[i], 0.9999), 0.0001)
        sum -= targets[i] * Math.log(p) + (1 - targets[i]) * Math.log(1 - p)
      }
      return sum / predictions.length
    },
    gradient: (predictions: number[], targets: number[]): number[] => {
      return predictions.map((pred, i) => {
        // Clip predictions to avoid division by zero
        const p = Math.max(Math.min(pred, 0.9999), 0.0001)
        return (p - targets[i]) / (p * (1 - p)) / predictions.length
      })
    },
  },
}

export interface EnhancedOptimizerConfig {
  learningRate: number
  weightDecay?: number
  beta1?: number // For Adam: exponential decay rate for first moment
  beta2?: number // For Adam: exponential decay rate for second moment
  epsilon?: number // For Adam: small constant for numerical stability
  useAdam?: boolean
  useScheduler?: boolean
  initialLearningRate?: number
  minLearningRate?: number
  decayRate?: number
  decaySteps?: number
}

/**
 * Enhanced Quantum Neural Network with advanced optimization and training features
 */
export class EnhancedQuantumNeuralNetwork {
  private layers: EnhancedQuantumLayer[]
  private useSkipConnections: boolean
  private useGradientClipping: boolean
  private gradientClipValue: number
  private isTraining = true
  private optimizer: QuantumOptimizer
  private performanceMonitor = PerformanceMonitor.getInstance()

  // Optimizer state
  private optimizerState: {
    m: number[][] // First moment (momentum)
    v: number[][] // Second moment (RMSProp)
    t: number // Timestep
    learningRate: number
  }

  constructor(config: EnhancedQuantumNNConfig) {
    this.layers = []
    let inputSize = config.inputSize

    // Initialize layers
    for (let i = 0; i < config.layerSizes.length; i++) {
      const outputSize = config.layerSizes[i]
      const layerConfig = config.layerConfigs?.[i] || {}

      this.layers.push(
        new EnhancedQuantumLayer({
          inputSize,
          outputSize,
          ...layerConfig,
        }),
      )

      inputSize = outputSize
    }

    // Initialize network configuration
    this.useSkipConnections = config.useSkipConnections || false
    this.useGradientClipping = config.useGradientClipping || false
    this.gradientClipValue = config.gradientClipValue || 5.0

    // Initialize optimizer
    this.optimizer = new QuantumOptimizer({
      learningRate: 0.001,
      strategy: config.optimizationStrategy || OptimizationStrategy.ADAPTIVE,
      useQuantumAcceleration: config.useQuantumAcceleration || false,
      useCache: config.useCache || true,
    })

    // Initialize optimizer state
    this.optimizerState = {
      m: this.layers.map((layer) => Array(layer.numParameters).fill(0)),
      v: this.layers.map((layer) => Array(layer.numParameters).fill(0)),
      t: 0,
      learningRate: 0.001,
    }
  }

  /**
   * Forward pass through the network
   */
  forward(inputs: number[] | number[][]): number[] | number[][] {
    return measurePerformance("EnhancedQuantumNeuralNetwork.forward", () => {
      // Check if inputs is a batch (2D array) or a single input (1D array)
      if (!Array.isArray(inputs[0])) {
        // Single input
        return this._forwardSingle(inputs as number[])
      } else {
        // Batch of inputs
        return (inputs as number[][]).map((input) => this._forwardSingle(input))
      }
    })
  }

  /**
   * Forward pass for a single input
   */
  private _forwardSingle(input: number[]): number[] {
    let current = input
    const skipConnectionOutputs: number[][] = []

    // Process through each layer
    for (let i = 0; i < this.layers.length; i++) {
      // Store output for skip connections if enabled
      if (this.useSkipConnections) {
        skipConnectionOutputs.push([...current])
      }

      // Forward through layer
      current = this.layers[i].forward(current)

      // Apply skip connection if applicable
      if (this.useSkipConnections && i > 0 && current.length === skipConnectionOutputs[i - 1].length) {
        current = current.map((val, j) => val + skipConnectionOutputs[i - 1][j] * 0.1)
      }
    }

    return current
  }

  /**
   * Set training mode for all layers
   */
  set training(isTraining: boolean) {
    this.isTraining = isTraining
    for (const layer of this.layers) {
      layer.setTrainingMode(isTraining)
    }
  }

  /**
   * Get training mode
   */
  get training(): boolean {
    return this.isTraining
  }

  /**
   * Train the network on a dataset
   */
  train(
    inputs: number[][],
    targets: number[][],
    config: {
      epochs: number
      batchSize: number
      optimizer: EnhancedOptimizerConfig
      lossFunction?: LossFunction
      gradientFunction?: GradientFunction
      validationSplit?: number
      earlyStoppingPatience?: number
      verbose?: boolean
    },
  ): number[] {
    return measurePerformance("EnhancedQuantumNeuralNetwork.train", () => {
      const {
        epochs,
        batchSize,
        optimizer,
        lossFunction = EnhancedLossFunctions.MSE.loss,
        gradientFunction = EnhancedLossFunctions.MSE.gradient,
        validationSplit = 0,
        earlyStoppingPatience = 0,
        verbose = true,
      } = config

      // Initialize optimizer
      if (optimizer.useAdam) {
        this.optimizerState.learningRate = optimizer.initialLearningRate || optimizer.learningRate
      }

      // Set training mode
      this.training = true

      const losses: number[] = []

      // Split data for validation if needed
      const numValidation = Math.floor(inputs.length * validationSplit)
      const numTraining = inputs.length - numValidation

      const trainingInputs = inputs.slice(0, numTraining)
      const trainingTargets = targets.slice(0, numTraining)

      const validationInputs = inputs.slice(numTraining)
      const validationTargets = targets.slice(numTraining)

      // Early stopping variables
      let bestValidationLoss = Number.POSITIVE_INFINITY
      let patienceCounter = 0

      // Training loop
      for (let epoch = 0; epoch < epochs; epoch++) {
        // Shuffle training data
        const indices = Array(numTraining)
          .fill(0)
          .map((_, i) => i)
        for (let i = indices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[indices[i], indices[j]] = [indices[j], indices[i]]
        }

        let totalLoss = 0

        // Train in batches
        for (let i = 0; i < numTraining; i += batchSize) {
          const batchIndices = indices.slice(i, i + batchSize)
          const batchInputs = batchIndices.map((idx) => trainingInputs[idx])
          const batchTargets = batchIndices.map((idx) => trainingTargets[idx])

          const batchLoss = this.trainBatch(batchInputs, batchTargets, {
            batchSize: batchIndices.length,
            optimizer,
            lossFunction,
            gradientFunction,
          })

          totalLoss += batchLoss * batchIndices.length
        }

        const avgTrainingLoss = totalLoss / numTraining
        losses.push(avgTrainingLoss)

        // Calculate validation loss if needed
        let validationLoss = 0
        if (numValidation > 0) {
          // Set to evaluation mode for validation
          this.training = false

          for (let i = 0; i < numValidation; i++) {
            const prediction = this._forwardSingle(validationInputs[i])
            validationLoss += lossFunction(prediction, validationTargets[i])
          }
          validationLoss /= numValidation

          // Set back to training mode
          this.training = true
        }

        // Update learning rate if scheduler is enabled
        if (optimizer.useScheduler) {
          this.optimizerState.learningRate = this._updateLearningRate(
            epoch,
            optimizer.initialLearningRate || optimizer.learningRate,
            optimizer.minLearningRate || 0.0001,
            optimizer.decayRate || 0.95,
            optimizer.decaySteps || 10,
          )
        }

        // Print progress
        if (verbose) {
          if (numValidation > 0) {
            console.log(
              `Epoch ${epoch + 1}/${epochs}, Loss: ${avgTrainingLoss.toFixed(6)}, ` +
                `Validation Loss: ${validationLoss.toFixed(6)}, ` +
                `LR: ${this.optimizerState.learningRate.toFixed(6)}`,
            )
          } else {
            console.log(
              `Epoch ${epoch + 1}/${epochs}, Loss: ${avgTrainingLoss.toFixed(6)}, ` +
                `LR: ${this.optimizerState.learningRate.toFixed(6)}`,
            )
          }
        }

        // Early stopping
        if (numValidation > 0 && earlyStoppingPatience > 0) {
          if (validationLoss < bestValidationLoss) {
            bestValidationLoss = validationLoss
            patienceCounter = 0
          } else {
            patienceCounter++
            if (patienceCounter >= earlyStoppingPatience) {
              if (verbose) {
                console.log(`Early stopping at epoch ${epoch + 1}`)
              }
              break
            }
          }
        }
      }

      return losses
    })
  }

  /**
   * Update learning rate using exponential decay
   */
  private _updateLearningRate(
    epoch: number,
    initialLR: number,
    minLR: number,
    decayRate: number,
    decaySteps: number,
  ): number {
    const newLR = initialLR * Math.pow(decayRate, Math.floor(epoch / decaySteps))
    return Math.max(minLR, newLR)
  }

  /**
   * Train on a single batch
   */
  trainBatch(
    inputs: number[][],
    targets: number[][],
    config: {
      batchSize: number
      optimizer: EnhancedOptimizerConfig
      lossFunction?: LossFunction
      gradientFunction?: GradientFunction
    },
  ): number {
    const {
      optimizer,
      lossFunction = EnhancedLossFunctions.MSE.loss,
      gradientFunction = EnhancedLossFunctions.MSE.gradient,
    } = config

    return this._trainOnBatch(inputs, targets, optimizer, lossFunction, gradientFunction)
  }

  // Add numerical stability to the _trainOnBatch method
  private _trainOnBatch(
    inputs: number[][],
    targets: number[][],
    optimizer: EnhancedOptimizerConfig,
    lossFunction: LossFunction,
    gradientFunction: GradientFunction,
  ): number {
    let totalLoss = 0

    // Initialize batch gradients
    const batchGradients = this.layers.map((layer) => Array(layer.numParameters).fill(0))

    // Process each sample in the batch
    for (let i = 0; i < inputs.length; i++) {
      try {
        // Forward pass
        const predictions = this._forwardSingle(inputs[i])

        // Check for NaN in predictions
        const validPredictions = predictions.map((p) => (isFinite(p) ? p : 0))
        const validTargets = targets[i].map((t) => (isFinite(t) ? t : 0))

        // Calculate loss
        const sampleLoss = lossFunction(validPredictions, validTargets)
        if (isFinite(sampleLoss)) {
          totalLoss += sampleLoss
        }

        // Backward pass
        const outputGradients = gradientFunction(validPredictions, validTargets)

        // Check for NaN in gradients
        const validGradients = outputGradients.map((g) => (isFinite(g) ? g : 0))

        this._backpropagate(inputs[i], validGradients, batchGradients)
      } catch (error) {
        console.error("Error processing sample:", error)
        // Continue with next sample
      }
    }

    // Average gradients over batch
    const batchSize = inputs.length
    for (let i = 0; i < this.layers.length; i++) {
      for (let j = 0; j < batchGradients[i].length; j++) {
        batchGradients[i][j] /= batchSize

        // Check for NaN in gradients
        if (!isFinite(batchGradients[i][j])) {
          batchGradients[i][j] = 0
        }
      }
    }

    // Apply gradient clipping if enabled
    if (this.useGradientClipping) {
      this._clipGradients(batchGradients)
    }

    // Update parameters
    this._updateParameters(batchGradients, optimizer)

    // Return average loss, ensuring it's finite
    return isFinite(totalLoss / batchSize) ? totalLoss / batchSize : 0.1
  }

  /**
   * Clip gradients to prevent exploding gradients
   */
  private _clipGradients(gradients: number[][]): void {
    for (let i = 0; i < gradients.length; i++) {
      for (let j = 0; j < gradients[i].length; j++) {
        gradients[i][j] = Math.max(-this.gradientClipValue, Math.min(this.gradientClipValue, gradients[i][j]))
      }
    }
  }

  /**
   * Backpropagation
   */
  private _backpropagate(input: number[], outputGradients: number[], batchGradients: number[][]): void {
    // Store only necessary layer inputs for backpropagation
    const layerInputs: number[][] = [input]
    let layerOutput = input

    // Forward pass to store intermediate inputs - only for layers that need it
    for (let i = 0; i < this.layers.length - 1; i++) {
      layerOutput = this.layers[i].forward(layerOutput)
      layerInputs.push(layerOutput)
    }

    // Backward pass with optimizations
    let currentGradient = outputGradients
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i]
      const layerInput = layerInputs[i]

      // Calculate gradients
      const layerGradients = layer.calculateGradients(layerInput, currentGradient)

      // Accumulate gradients - faster in-place addition
      const batchGrad = batchGradients[i]
      const len = Math.min(layerGradients.length, batchGrad.length)
      for (let j = 0; j < len; j++) {
        batchGrad[j] += layerGradients[j]
      }

      // Propagate gradients to previous layer if needed
      if (i > 0) {
        currentGradient = layer.backpropagateGradient(currentGradient)

        // Add skip connection gradients if applicable - faster implementation
        if (this.useSkipConnections && currentGradient.length === layerInputs[i - 1].length) {
          for (let j = 0; j < currentGradient.length; j++) {
            currentGradient[j] += outputGradients[j] * 0.1
          }
        }
      }
    }
  }

  // Improve the _updateParameters method with numerical stability
  private _updateParameters(gradients: number[][], optimizer: EnhancedOptimizerConfig): void {
    const useAdam = optimizer.useAdam || false
    const learningRate = this.optimizerState.learningRate
    const weightDecay = optimizer.weightDecay || 0

    if (useAdam) {
      // Optimized Adam implementation with numerical stability
      const beta1 = optimizer.beta1 || 0.9
      const beta2 = optimizer.beta2 || 0.999
      const epsilon = optimizer.epsilon || 1e-8

      this.optimizerState.t += 1
      const t = this.optimizerState.t
      const t1 = 1 - Math.pow(beta1, t)
      const t2 = 1 - Math.pow(beta2, t)

      // Update each layer's parameters with safer calculations
      for (let i = 0; i < this.layers.length; i++) {
        const layer = this.layers[i]
        const layerGradients = gradients[i]
        const m = this.optimizerState.m[i]
        const v = this.optimizerState.v[i]
        const updates = new Array(layerGradients.length)

        // Batch process all parameters
        for (let j = 0; j < layerGradients.length; j++) {
          // Ensure gradient is finite
          const gradient = isFinite(layerGradients[j]) ? layerGradients[j] + weightDecay * layerGradients[j] : 0

          // Update momentum with safety checks
          m[j] = beta1 * m[j] + (1 - beta1) * gradient
          if (!isFinite(m[j])) m[j] = 0

          // Update velocity with safety checks
          v[j] = beta2 * v[j] + (1 - beta2) * gradient * gradient
          if (!isFinite(v[j])) v[j] = 0

          // Compute bias-corrected estimates
          const mHat = m[j] / t1
          const vHat = v[j] / t2

          // Calculate update with safety checks
          const update = (learningRate * mHat) / (Math.sqrt(Math.max(vHat, 1e-10)) + epsilon)

          // Ensure update is finite and reasonably sized
          updates[j] = isFinite(update) ? Math.max(-1, Math.min(1, update)) : 0
        }

        // Apply all updates at once
        layer.updateParameters(updates, 1.0, 0)
      }
    } else {
      // Standard SGD with momentum - safer implementation
      for (let i = 0; i < this.layers.length; i++) {
        // Ensure all gradients are finite
        const safeGradients = gradients[i].map((g) => (isFinite(g) ? g : 0))
        this.layers[i].updateParameters(safeGradients, learningRate, weightDecay)
      }
    }
  }

  /**
   * Reset memory states in all layers
   */
  resetMemory(): void {
    for (const layer of this.layers) {
      layer.resetMemory()
    }
  }

  /**
   * Get performance metrics for the network
   */
  getPerformanceMetrics(): { operation: string; count: number; avgTime: number; maxTime: number }[] {
    return this.performanceMonitor.getMetrics()
  }

  /**
   * Get optimizer cache statistics
   */
  getOptimizerCacheStats(): { size: number; hits: number; misses: number; hitRate: number } {
    return this.optimizer.getCacheStats()
  }
}

