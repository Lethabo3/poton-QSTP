export interface QuantumNeuronConfig {
  inputSize: number
  numQubits?: number
}

export class QuantumNeuron {
  private _weights: number[]
  private _bias: number

  constructor(config: QuantumNeuronConfig) {
    const numWeights = config.inputSize
    this._weights = Array(numWeights)
      .fill(0)
      .map(() => Math.random() - 0.5)
    this._bias = Math.random() - 0.5
  }

  // Add a weights property getter
  get weights(): number[] {
    return [...this._weights]
  }

  get parameters(): number[] {
    return [...this._weights, this._bias]
  }

  set parameters(params: number[]) {
    if (params.length !== this._weights.length + 1) {
      throw new Error(`Expected ${this._weights.length + 1} parameters, got ${params.length}`)
    }
    this._weights = params.slice(0, params.length - 1)
    this._bias = params[params.length - 1]
  }

  forward(inputs: number[]): number {
    if (inputs.length !== this._weights.length) {
      // Create a padded or truncated input array
      const paddedInputs = [...inputs]
      while (paddedInputs.length < this._weights.length) {
        paddedInputs.push(0) // Pad with zeros if needed
      }
      inputs = paddedInputs.slice(0, this._weights.length) // Truncate if too long
    }

    let sum = this._bias
    for (let i = 0; i < this._weights.length; i++) {
      sum += inputs[i] * this._weights[i]
    }
    return Math.tanh(sum) // Using tanh as activation function
  }

  calculateGradients(inputs: number[]): number[] {
    // Check if inputs match the expected size
    if (inputs.length !== this._weights.length) {
      // Create a padded or truncated input array
      const paddedInputs = [...inputs]
      while (paddedInputs.length < this._weights.length) {
        paddedInputs.push(0) // Pad with zeros if needed
      }
      inputs = paddedInputs.slice(0, this._weights.length) // Truncate if too long
    }

    const output = this.forward(inputs)
    const gradients = inputs.map((input) => input * (1 - output * output)) // Derivative of tanh
    return [...gradients, 1] // Include bias gradient
  }

  backpropagateGradient(outputGradient: number[]): number[] {
    // This is a simplified backpropagation for demonstration
    return this._weights.map((weight) => weight * outputGradient[0])
  }

  updateParameters(gradients: number[], learningRate: number, weightDecay = 0): void {
    for (let i = 0; i < this._weights.length; i++) {
      this._weights[i] -= learningRate * (gradients[i] + weightDecay * this._weights[i])
    }
    this._bias -= learningRate * gradients[this._weights.length]
  }

  get numParameters(): number {
    return this._weights.length + 1 // Weights + bias
  }

  resetMemory(): void {
    // This neuron doesn't have memory, but we keep this method for consistency
  }
}

