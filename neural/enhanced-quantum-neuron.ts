import { type Complex, complex } from "../utils/complex-utils"

export interface EnhancedQuantumNeuronConfig {
  inputSize: number
  numQubits?: number
  activationFunction?: "tanh" | "sigmoid" | "relu" | "quantum"
  useQuantumPhaseActivation?: boolean
  useAmplitudeEncoding?: boolean
  quantumNoiseResilience?: number
  initializationScale?: number
}

/**
 * Enhanced quantum neuron with advanced quantum-inspired features
 */
export class EnhancedQuantumNeuron {
  private _weights: number[]
  private _bias: number
  private _phaseWeights: number[] // For quantum phase encoding
  private _amplitudeWeights: number[] // For amplitude encoding
  private _quantumMemory: Complex[] // Quantum memory state
  private _activationFunction: "tanh" | "sigmoid" | "relu" | "quantum"
  private _useQuantumPhaseActivation: boolean
  private _useAmplitudeEncoding: boolean
  private _quantumNoiseResilience: number
  private _lastActivations: number[] = []
  private _lastInput: number[] = []
  private _inputSize: number

  constructor(config: EnhancedQuantumNeuronConfig) {
    this._inputSize = config.inputSize
    const numWeights = config.inputSize
    const scale = config.initializationScale || 0.1

    // Xavier/Glorot initialization for better gradient flow
    const stdDev = Math.sqrt(2 / (config.inputSize + 1))

    this._weights = Array(numWeights)
      .fill(0)
      .map(() => (Math.random() * 2 - 1) * stdDev * scale)

    this._bias = (Math.random() * 2 - 1) * stdDev * scale

    // Quantum phase weights (for interference effects)
    this._phaseWeights = Array(numWeights)
      .fill(0)
      .map(() => Math.random() * Math.PI * 2)

    // Amplitude encoding weights
    this._amplitudeWeights = Array(numWeights)
      .fill(0)
      .map(() => Math.random() * 0.5)

    // Initialize quantum memory
    this._quantumMemory = Array(config.numQubits || 3)
      .fill(0)
      .map(() => complex(0, 0))

    // Set activation function
    this._activationFunction = config.activationFunction || "tanh"
    this._useQuantumPhaseActivation = config.useQuantumPhaseActivation || false
    this._useAmplitudeEncoding = config.useAmplitudeEncoding || false
    this._quantumNoiseResilience = config.quantumNoiseResilience || 0.01
  }

  // Getters and setters
  get weights(): number[] {
    return [...this._weights]
  }

  get parameters(): number[] {
    return [...this._weights, this._bias, ...this._phaseWeights, ...this._amplitudeWeights]
  }

  set parameters(params: number[]) {
    const totalParams = this._weights.length + 1 + this._phaseWeights.length + this._amplitudeWeights.length
    if (params.length !== totalParams) {
      throw new Error(`Expected ${totalParams} parameters, got ${params.length}`)
    }

    let offset = 0
    this._weights = params.slice(offset, offset + this._weights.length)
    offset += this._weights.length

    this._bias = params[offset]
    offset += 1

    this._phaseWeights = params.slice(offset, offset + this._phaseWeights.length)
    offset += this._phaseWeights.length

    this._amplitudeWeights = params.slice(offset, offset + this._amplitudeWeights.length)
  }

  get lastInput(): number[] {
    return [...this._lastInput]
  }

  /**
   * Forward pass with quantum-inspired computation
   */
  forward(inputs: number[]): number {
    // Handle input size mismatch with faster approach
    if (inputs.length !== this._inputSize) {
      const paddedInputs = new Array(this._inputSize).fill(0)
      for (let i = 0; i < Math.min(inputs.length, this._inputSize); i++) {
        paddedInputs[i] = inputs[i]
      }
      inputs = paddedInputs
    }

    this._lastInput = inputs

    // Fast weighted sum calculation with numerical stability
    let sum = this._bias
    const len = Math.min(this._weights.length, inputs.length)
    for (let i = 0; i < len; i++) {
      // Check for valid inputs and weights
      if (isFinite(inputs[i]) && isFinite(this._weights[i])) {
        sum += inputs[i] * this._weights[i]
      }
    }

    // Clip sum to prevent extreme values
    sum = Math.max(-100, Math.min(100, sum))

    // Optimize quantum phase calculation - only apply if significant
    if (this._useQuantumPhaseActivation) {
      // Use a faster approximation with fewer calculations
      let phaseSum = 0
      for (let i = 0; i < this._phaseWeights.length; i += 2) {
        // Skip every other weight for speed
        if (isFinite(inputs[i]) && isFinite(this._phaseWeights[i])) {
          phaseSum += Math.sin(inputs[i] * this._phaseWeights[i])
        }
      }
      sum += phaseSum * 0.2
      // Clip again after phase addition
      sum = Math.max(-100, Math.min(100, sum))
    }

    // Optimize amplitude encoding - only apply if significant
    if (this._useAmplitudeEncoding && Math.random() > 0.5) {
      // Apply probabilistically for speed
      let amplitudeSum = 0
      for (let i = 0; i < this._amplitudeWeights.length; i += 2) {
        // Skip every other weight
        if (isFinite(inputs[i]) && isFinite(this._amplitudeWeights[i])) {
          amplitudeSum += inputs[i] * this._amplitudeWeights[i]
        }
      }
      // Clip amplitude sum
      amplitudeSum = Math.max(-10, Math.min(10, amplitudeSum))
      sum *= 1 + Math.sin(amplitudeSum) * 0.1
    }

    // Fast activation function calculation with numerical stability
    let output: number
    switch (this._activationFunction) {
      case "sigmoid":
        // Clip input to sigmoid to avoid overflow
        const clippedSum = Math.max(-20, Math.min(20, sum))
        output = 1 / (1 + Math.exp(-clippedSum))
        break
      case "relu":
        output = sum > 0 ? sum : 0
        break
      case "quantum":
        // Faster quantum-inspired activation
        output = Math.sin(sum) * 0.5 + 0.5
        break
      case "tanh":
      default:
        // Fast tanh approximation with clipping
        const clippedForTanh = Math.max(-20, Math.min(20, sum))
        const exp2x = Math.exp(2 * clippedForTanh)
        output = (exp2x - 1) / (exp2x + 1)
        break
    }

    // Add quantum noise less frequently
    if (this._quantumNoiseResilience > 0 && Math.random() > 0.7) {
      const noise = (Math.random() * 2 - 1) * this._quantumNoiseResilience
      output += noise

      // Ensure output is in valid range with faster clamping
      if (output < -1) output = -1
      else if (output > 1) output = 1
    }

    // Update quantum memory less frequently
    if (Math.random() > 0.7) {
      this._updateQuantumMemory(output)
    }

    // Final check for NaN or Infinity
    if (!isFinite(output)) {
      output = 0 // Default to 0 if we somehow got NaN or Infinity
    }

    // Store activation for backpropagation (keep only the most recent)
    this._lastActivations = [output]

    return output
  }

  /**
   * Update quantum memory state
   */
  private _updateQuantumMemory(output: number): void {
    // Simplified memory update with fewer calculations
    for (let i = 0; i < this._quantumMemory.length; i += 2) {
      // Update every other memory cell
      const phase = (output * Math.PI) / 2
      const newReal = this._quantumMemory[i].real * Math.cos(phase) - this._quantumMemory[i].imag * Math.sin(phase)
      const newImag = this._quantumMemory[i].real * Math.sin(phase) + this._quantumMemory[i].imag * Math.cos(phase)

      // Faster decay calculation
      const decay = 0.95
      this._quantumMemory[i] = complex(newReal * decay, newImag * decay)
    }
  }

  /**
   * Calculate gradients for backpropagation
   */
  calculateGradients(inputs: number[]): number[] {
    // Handle input size mismatch
    if (inputs.length !== this._inputSize) {
      const paddedInputs = [...inputs]
      while (paddedInputs.length < this._inputSize) {
        paddedInputs.push(0)
      }
      inputs = paddedInputs.slice(0, this._inputSize)
    }

    // Get the last activation
    const output =
      this._lastActivations.length > 0 ? this._lastActivations[this._lastActivations.length - 1] : this.forward(inputs)

    // Calculate derivative based on activation function
    let derivative: number
    switch (this._activationFunction) {
      case "sigmoid":
        derivative = output * (1 - output)
        break
      case "relu":
        derivative = output > 0 ? 1 : 0
        break
      case "quantum":
        // Derivative of quantum activation
        const sum = this._calculateWeightedSum(inputs)
        derivative = Math.cos(sum) * 0.5
        break
      case "tanh":
      default:
        derivative = 1 - output * output
        break
    }

    // Calculate gradients for weights
    const weightGradients = inputs.map((input) => input * derivative)

    // Calculate gradient for bias
    const biasGradient = derivative

    // Calculate gradients for phase weights (if used)
    const phaseGradients = this._useQuantumPhaseActivation
      ? inputs.map((input, i) => {
          const phaseDerivative = Math.cos(input * this._phaseWeights[i]) * input * 0.2
          return phaseDerivative * derivative
        })
      : Array(this._phaseWeights.length).fill(0)

    // Calculate gradients for amplitude weights (if used)
    const amplitudeGradients = this._useAmplitudeEncoding
      ? inputs.map((input, i) => {
          const sum = this._calculateWeightedSum(inputs)
          const amplitudeDerivative = Math.cos(sum) * input * 0.1
          return amplitudeDerivative * derivative
        })
      : Array(this._amplitudeWeights.length).fill(0)

    // Return all gradients
    return [...weightGradients, biasGradient, ...phaseGradients, ...amplitudeGradients]
  }

  /**
   * Helper to calculate weighted sum
   */
  private _calculateWeightedSum(inputs: number[]): number {
    let sum = this._bias
    for (let i = 0; i < this._weights.length; i++) {
      sum += inputs[i] * this._weights[i]
    }
    return sum
  }

  /**
   * Backpropagate gradient to previous layer
   */
  backpropagateGradient(outputGradient: number[]): number[] {
    // Calculate input gradients
    return this._weights.map((weight) => weight * outputGradient[0])
  }

  /**
   * Update parameters with gradients
   */
  updateParameters(gradients: number[], learningRate: number, weightDecay = 0): void {
    // Ensure we have the right number of gradients
    const totalParams = this._weights.length + 1 + this._phaseWeights.length + this._amplitudeWeights.length
    if (gradients.length !== totalParams) {
      console.warn(`Expected ${totalParams} gradients, got ${gradients.length}. Using available gradients.`)
    }

    // Apply gradients to weights with weight decay regularization
    let offset = 0
    for (let i = 0; i < this._weights.length; i++) {
      if (offset + i < gradients.length) {
        this._weights[i] -= learningRate * (gradients[offset + i] + weightDecay * this._weights[i])
      }
    }
    offset += this._weights.length

    // Apply gradient to bias
    if (offset < gradients.length) {
      this._bias -= learningRate * gradients[offset]
    }
    offset += 1

    // Apply gradients to phase weights
    for (let i = 0; i < this._phaseWeights.length; i++) {
      if (offset + i < gradients.length) {
        this._phaseWeights[i] -= learningRate * gradients[offset + i]
        // Keep phase weights in [0, 2π] range
        this._phaseWeights[i] = (this._phaseWeights[i] + Math.PI * 2) % (Math.PI * 2)
      }
    }
    offset += this._phaseWeights.length

    // Apply gradients to amplitude weights
    for (let i = 0; i < this._amplitudeWeights.length; i++) {
      if (offset + i < gradients.length) {
        this._amplitudeWeights[i] -= learningRate * gradients[offset + i]
        // Keep amplitude weights positive
        this._amplitudeWeights[i] = Math.max(0, this._amplitudeWeights[i])
      }
    }
  }

  get numParameters(): number {
    return this._weights.length + 1 + this._phaseWeights.length + this._amplitudeWeights.length
  }

  resetMemory(): void {
    // Reset quantum memory state
    for (let i = 0; i < this._quantumMemory.length; i++) {
      this._quantumMemory[i] = complex(0, 0)
    }
    this._lastActivations = []
  }
}

