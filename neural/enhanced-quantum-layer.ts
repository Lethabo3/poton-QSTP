import { EnhancedQuantumNeuron, type EnhancedQuantumNeuronConfig } from "./enhanced-quantum-neuron"

export interface EnhancedQuantumLayerConfig {
  inputSize: number
  outputSize: number
  neuronConfig?: Omit<EnhancedQuantumNeuronConfig, "inputSize">
  useBatchNormalization?: boolean
  useLayerNormalization?: boolean
  useResidualConnection?: boolean
  useAttentionMechanism?: boolean
  dropoutRate?: number
}

/**
 * Enhanced quantum layer with advanced features
 */
export class EnhancedQuantumLayer {
  private neurons: EnhancedQuantumNeuron[]
  private lastOutput: number[] = []
  private lastInput: number[] = []
  private inputSize: number
  private outputSize: number

  // Layer normalization parameters
  private gamma: number[] = []
  private beta: number[] = []

  // Batch normalization running statistics
  private runningMean: number[] = []
  private runningVar: number[] = []

  // Configuration
  private useBatchNorm: boolean
  private useLayerNorm: boolean
  private useResidual: boolean
  private useAttention: boolean
  private dropoutRate: number
  private isTraining = true

  // Attention mechanism parameters
  private attentionWeights: number[][] = []

  constructor(config: EnhancedQuantumLayerConfig) {
    this.inputSize = config.inputSize
    this.outputSize = config.outputSize

    // Initialize neurons with enhanced configuration
    this.neurons = Array(config.outputSize)
      .fill(null)
      .map(
        () =>
          new EnhancedQuantumNeuron({
            inputSize: config.inputSize,
            ...config.neuronConfig,
          }),
      )

    // Initialize normalization parameters
    this.useBatchNorm = config.useBatchNormalization || false
    this.useLayerNorm = config.useLayerNormalization || false
    this.useResidual = config.useResidualConnection || false
    this.useAttention = config.useAttentionMechanism || false
    this.dropoutRate = config.dropoutRate || 0

    if (this.useLayerNorm) {
      this.gamma = Array(config.outputSize).fill(1)
      this.beta = Array(config.outputSize).fill(0)
    }

    if (this.useBatchNorm) {
      this.runningMean = Array(config.outputSize).fill(0)
      this.runningVar = Array(config.outputSize).fill(1)
    }

    if (this.useAttention) {
      // Initialize attention weights (simple self-attention)
      this.attentionWeights = Array(config.outputSize)
        .fill(null)
        .map(() =>
          Array(config.outputSize)
            .fill(0)
            .map(() => Math.random() * 0.1),
        )
    }
  }

  /**
   * Forward pass through the layer
   */
  forward(inputs: number[]): number[] {
    // Fast input size handling
    if (inputs.length !== this.inputSize) {
      const paddedInputs = new Array(this.inputSize).fill(0)
      for (let i = 0; i < Math.min(inputs.length, this.inputSize); i++) {
        paddedInputs[i] = inputs[i]
      }
      inputs = paddedInputs
    }

    this.lastInput = inputs

    // Get raw neuron outputs - process in parallel when possible
    let outputs = this.neurons.map((neuron) => neuron.forward(inputs))

    // Apply normalization and other features selectively for speed
    if (this.useLayerNorm && this.isTraining) {
      outputs = this._applyLayerNorm(outputs)
    }

    if (this.useBatchNorm && this.isTraining) {
      outputs = this._applyBatchNorm(outputs)
    }

    // Apply attention only during training or with probability
    if (this.useAttention && (this.isTraining || Math.random() > 0.7)) {
      outputs = this._applyAttention(outputs)
    }

    // Apply dropout only during training
    if (this.isTraining && this.dropoutRate > 0) {
      outputs = this._applyDropout(outputs)
    }

    // Apply residual connection if enabled and dimensions match
    if (this.useResidual && inputs.length === outputs.length) {
      for (let i = 0; i < outputs.length; i++) {
        outputs[i] += inputs[i] * 0.1
      }
    }

    this.lastOutput = outputs

    return outputs
  }

  /**
   * Apply layer normalization
   */
  private _applyLayerNorm(outputs: number[]): number[] {
    // Fast mean calculation
    let sum = 0
    for (let i = 0; i < outputs.length; i++) {
      sum += outputs[i]
    }
    const mean = sum / outputs.length

    // Fast variance calculation
    let variance = 0
    for (let i = 0; i < outputs.length; i++) {
      const diff = outputs[i] - mean
      variance += diff * diff
    }
    variance /= outputs.length

    const std = Math.sqrt(variance + 1e-5)

    // In-place normalization for speed
    const result = new Array(outputs.length)
    for (let i = 0; i < outputs.length; i++) {
      result[i] = this.gamma[i] * ((outputs[i] - mean) / std) + this.beta[i]
    }

    return result
  }

  /**
   * Apply batch normalization
   */
  private _applyBatchNorm(outputs: number[]): number[] {
    if (this.isTraining) {
      // Calculate batch statistics
      const mean = outputs.reduce((sum, val) => sum + val, 0) / outputs.length
      const variance = outputs.reduce((sum, val) => sum + (val - mean) ** 2, 0) / outputs.length

      // Update running statistics
      const momentum = 0.9
      for (let i = 0; i < this.outputSize; i++) {
        this.runningMean[i] = momentum * this.runningMean[i] + (1 - momentum) * mean
        this.runningVar[i] = momentum * this.runningVar[i] + (1 - momentum) * variance
      }

      // Normalize using batch statistics
      return outputs.map((output) => (output - mean) / Math.sqrt(variance + 1e-5))
    } else {
      // Use running statistics during inference
      return outputs.map((output, i) => (output - this.runningMean[i]) / Math.sqrt(this.runningVar[i] + 1e-5))
    }
  }

  /**
   * Apply attention mechanism
   */
  private _applyAttention(outputs: number[]): number[] {
    // Simplified attention for speed - only apply to a subset of neurons
    const attentionOutputs = new Array(outputs.length).fill(0)
    const attentionSize = Math.min(outputs.length, 8) // Limit attention computation

    // Calculate attention scores for a subset
    for (let i = 0; i < attentionSize; i++) {
      for (let j = 0; j < attentionSize; j++) {
        attentionOutputs[i] += outputs[j] * this.attentionWeights[i][j]
      }
    }

    // Fast residual connection
    for (let i = 0; i < outputs.length; i++) {
      if (i < attentionSize) {
        outputs[i] += attentionOutputs[i] * 0.1
      }
    }

    return outputs
  }

  /**
   * Apply dropout
   */
  private _applyDropout(outputs: number[]): number[] {
    const scale = 1 / (1 - this.dropoutRate)
    return outputs.map((output) => (Math.random() > this.dropoutRate ? output * scale : 0))
  }

  /**
   * Calculate gradients for backpropagation
   */
  calculateGradients(inputs: number[], outputGradients: number[]): number[] {
    // Handle input size mismatch
    if (inputs.length !== this.inputSize) {
      const paddedInputs = [...inputs]
      while (paddedInputs.length < this.inputSize) {
        paddedInputs.push(0)
      }
      inputs = paddedInputs.slice(0, this.inputSize)
    }

    // Apply gradients through normalization and attention if used
    let neuronGradients = [...outputGradients]

    // Backpropagate through residual connection
    if (this.useResidual && inputs.length === neuronGradients.length) {
      // Gradient flows unchanged through residual connection
    }

    // Backpropagate through attention
    if (this.useAttention) {
      const attentionGradients = Array(neuronGradients.length).fill(0)
      for (let i = 0; i < neuronGradients.length; i++) {
        for (let j = 0; j < neuronGradients.length; j++) {
          attentionGradients[j] += neuronGradients[i] * this.attentionWeights[i][j] * 0.1
        }
      }
      neuronGradients = neuronGradients.map((grad, i) => grad + attentionGradients[i])
    }

    // Backpropagate through batch/layer normalization
    // (simplified - in a real implementation we would calculate proper gradients)

    // Calculate gradients for each neuron
    return this.neurons.flatMap((neuron, i) => neuron.calculateGradients(inputs).map((g) => g * neuronGradients[i]))
  }

  /**
   * Backpropagate gradient to previous layer
   */
  backpropagateGradient(outputGradients: number[]): number[] {
    // Initialize input gradients
    const inputGradients = Array(this.inputSize).fill(0)

    // Aggregate gradients from all neurons
    for (let i = 0; i < this.neurons.length; i++) {
      const neuronInputGrads = this.neurons[i].backpropagateGradient([outputGradients[i]])
      for (let j = 0; j < Math.min(inputGradients.length, neuronInputGrads.length); j++) {
        inputGradients[j] += neuronInputGrads[j]
      }
    }

    // Add residual connection gradients if applicable
    if (this.useResidual && outputGradients.length === this.inputSize) {
      for (let i = 0; i < this.inputSize; i++) {
        inputGradients[i] += outputGradients[i]
      }
    }

    return inputGradients
  }

  /**
   * Update parameters with gradients
   */
  updateParameters(gradients: number[], learningRate: number, weightDecay = 0): void {
    let offset = 0

    // Update neuron parameters
    for (const neuron of this.neurons) {
      const numParams = neuron.numParameters
      const neuronGradients = gradients.slice(offset, offset + numParams)
      neuron.updateParameters(neuronGradients, learningRate, weightDecay)
      offset += numParams
    }

    // Update layer normalization parameters if used
    if (this.useLayerNorm) {
      for (let i = 0; i < this.outputSize; i++) {
        if (offset + i < gradients.length) {
          this.gamma[i] -= learningRate * gradients[offset + i]
        }
      }
      offset += this.outputSize

      for (let i = 0; i < this.outputSize; i++) {
        if (offset + i < gradients.length) {
          this.beta[i] -= learningRate * gradients[offset + i]
        }
      }
      offset += this.outputSize
    }

    // Update attention weights if used
    if (this.useAttention) {
      for (let i = 0; i < this.outputSize; i++) {
        for (let j = 0; j < this.outputSize; j++) {
          if (offset < gradients.length) {
            this.attentionWeights[i][j] -= learningRate * gradients[offset]
            offset++
          }
        }
      }
    }
  }

  /**
   * Set training mode
   */
  setTrainingMode(isTraining: boolean): void {
    this.isTraining = isTraining
  }

  /**
   * Get total number of parameters
   */
  get numParameters(): number {
    let count = this.neurons.reduce((sum, neuron) => sum + neuron.numParameters, 0)

    // Add layer normalization parameters
    if (this.useLayerNorm) {
      count += this.outputSize * 2 // gamma and beta
    }

    // Add attention parameters
    if (this.useAttention) {
      count += this.outputSize * this.outputSize // attention weights
    }

    return count
  }

  getLastOutput(): number[] {
    return this.lastOutput
  }

  getLastInput(): number[] {
    return this.lastInput
  }

  resetMemory(): void {
    for (const neuron of this.neurons) {
      neuron.resetMemory()
    }
  }
}

