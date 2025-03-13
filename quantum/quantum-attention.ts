import { QuantumCircuit } from "./quantum-circuit"
import { H, RY, RZ, CNOT } from "./quantum-gates"

/**
 * Implements a quantum attention mechanism that allows the network to focus
 * on relevant parts of the input data
 */
export class QuantumAttention {
  private _numHeads: number
  private _headDimension: number
  private _inputDimension: number
  private _queryParams: number[]
  private _keyParams: number[]
  private _valueParams: number[]
  private _outputParams: number[]

  /**
   * Creates a new quantum attention mechanism
   * @param inputDimension Dimension of the input data
   * @param numHeads Number of attention heads
   * @param headDimension Dimension of each attention head
   */
  constructor(inputDimension: number, numHeads = 2, headDimension = 2) {
    this._numHeads = numHeads
    this._headDimension = headDimension
    this._inputDimension = inputDimension

    // Initialize parameters for query, key, value transformations
    const paramsPerTransform = inputDimension * numHeads * headDimension
    this._queryParams = Array(paramsPerTransform)
      .fill(0)
      .map(() => Math.random() * Math.PI * 2)
    this._keyParams = Array(paramsPerTransform)
      .fill(0)
      .map(() => Math.random() * Math.PI * 2)
    this._valueParams = Array(paramsPerTransform)
      .fill(0)
      .map(() => Math.random() * Math.PI * 2)

    // Output projection parameters
    this._outputParams = Array(numHeads * headDimension * inputDimension)
      .fill(0)
      .map(() => Math.random() * Math.PI * 2)
  }

  /**
   * Gets all parameters of the attention mechanism
   */
  get parameters(): number[] {
    return [...this._queryParams, ...this._keyParams, ...this._valueParams, ...this._outputParams]
  }

  /**
   * Sets all parameters of the attention mechanism
   */
  set parameters(params: number[]) {
    const expectedLength =
      this._queryParams.length + this._keyParams.length + this._valueParams.length + this._outputParams.length

    if (params.length !== expectedLength) {
      throw new Error(`Expected ${expectedLength} parameters, got ${params.length}`)
    }

    let offset = 0
    this._queryParams = params.slice(offset, (offset += this._queryParams.length))
    this._keyParams = params.slice(offset, (offset += this._keyParams.length))
    this._valueParams = params.slice(offset, (offset += this._valueParams.length))
    this._outputParams = params.slice(offset, (offset += this._outputParams.length))
  }

  /**
   * Gets the number of parameters in the attention mechanism
   */
  get numParameters(): number {
    return this._queryParams.length + this._keyParams.length + this._valueParams.length + this._outputParams.length
  }

  /**
   * Applies the quantum attention mechanism to the input data
   * @param inputs Input data
   * @returns Transformed output with attention applied
   */
  forward(inputs: number[]): number[] {
    if (inputs.length !== this._inputDimension) {
      throw new Error(`Expected ${this._inputDimension} inputs, got ${inputs.length}`)
    }

    // Create quantum circuits for each head
    const headOutputs: number[][] = []

    for (let h = 0; h < this._numHeads; h++) {
      // Create query, key, value circuits
      const queryCircuit = this._createTransformCircuit(inputs, this._queryParams, h)
      const keyCircuit = this._createTransformCircuit(inputs, this._keyParams, h)
      const valueCircuit = this._createTransformCircuit(inputs, this._valueParams, h)

      // Execute circuits
      queryCircuit.execute()
      keyCircuit.execute()
      valueCircuit.execute()

      // Calculate attention scores using quantum measurements
      const attentionScores = this._calculateAttentionScores(queryCircuit, keyCircuit)

      // Apply attention scores to values
      const headOutput = this._applyAttention(valueCircuit, attentionScores)
      headOutputs.push(headOutput)
    }

    // Concatenate and project head outputs
    return this._projectOutputs(headOutputs)
  }

  /**
   * Creates a quantum circuit for transforming inputs
   */
  private _createTransformCircuit(inputs: number[], params: number[], headIndex: number): QuantumCircuit {
    const numQubits = this._headDimension + 1 // +1 for ancilla qubit
    const circuit = new QuantumCircuit(numQubits)

    // Apply Hadamard to create superposition
    for (let q = 0; q < numQubits; q++) {
      circuit.addGate(H, [q])
    }

    // Apply parameterized rotations based on inputs
    const paramsPerHead = this._inputDimension * this._headDimension
    const headOffset = headIndex * paramsPerHead

    for (let i = 0; i < this._inputDimension; i++) {
      for (let q = 0; q < this._headDimension; q++) {
        const paramIndex = headOffset + i * this._headDimension + q
        const rotationAngle = inputs[i] * params[paramIndex]

        circuit.addGate(RY(rotationAngle), [q])
        circuit.addGate(RZ(rotationAngle * 0.5), [q])
      }
    }

    // Create entanglement between qubits
    for (let q = 0; q < this._headDimension - 1; q++) {
      circuit.addGate(CNOT, [q, q + 1])
    }

    return circuit
  }

  /**
   * Calculates attention scores between query and key circuits
   */
  private _calculateAttentionScores(queryCircuit: QuantumCircuit, keyCircuit: QuantumCircuit): number[] {
    const scores: number[] = []

    // Perform multiple measurements to estimate quantum state overlap
    const numSamples = 100

    for (let q = 0; q < this._headDimension; q++) {
      let matchCount = 0

      for (let i = 0; i < numSamples; i++) {
        const queryClone = queryCircuit.clone()
        const keyClone = keyCircuit.clone()

        const queryResult = queryClone.measure(q)
        const keyResult = keyClone.measure(q)

        // Count matching measurement results
        if (queryResult === keyResult) {
          matchCount++
        }
      }

      // Calculate score as probability of matching measurements
      const score = matchCount / numSamples
      scores.push(score)
    }

    // Apply softmax to get attention weights
    return this._softmax(scores)
  }

  /**
   * Applies attention scores to value circuit
   */
  private _applyAttention(valueCircuit: QuantumCircuit, attentionScores: number[]): number[] {
    const output: number[] = []

    // Measure each qubit multiple times to get expectation values
    const numSamples = 100

    for (let q = 0; q < this._headDimension; q++) {
      let sum = 0

      for (let i = 0; i < numSamples; i++) {
        const circuitClone = valueCircuit.clone()
        const measurement = circuitClone.measure(q)
        sum += measurement
      }

      // Calculate expectation value and weight by attention score
      const expectation = sum / numSamples
      output.push(expectation * attentionScores[q])
    }

    return output
  }

  /**
   * Projects concatenated head outputs to final output dimension
   */
  private _projectOutputs(headOutputs: number[][]): number[] {
    // Concatenate all head outputs
    const concatenated = headOutputs.flat()

    // Project back to input dimension
    const output = Array(this._inputDimension).fill(0)

    for (let i = 0; i < this._inputDimension; i++) {
      for (let j = 0; j < concatenated.length; j++) {
        const paramIndex = i * concatenated.length + j
        output[i] += concatenated[j] * Math.sin(this._outputParams[paramIndex])
      }
    }

    return output
  }

  /**
   * Applies softmax function to convert scores to probabilities
   */
  private _softmax(values: number[]): number[] {
    // Apply exponential and find sum
    const exps = values.map((x) => Math.exp(x))
    const sum = exps.reduce((a, b) => a + b, 0)

    // Normalize to get probabilities
    return exps.map((exp) => exp / sum)
  }

  /**
   * Calculates gradients for all parameters
   * @param inputs Input data
   * @param outputGradients Gradients of the loss with respect to outputs
   * @returns Gradients for all parameters
   */
  calculateGradients(inputs: number[], outputGradients: number[]): number[] {
    // Parameter-shift rule for gradient estimation
    const gradients: number[] = []
    const originalOutput = this.forward(inputs)

    // For each parameter, calculate gradient using parameter-shift rule
    for (let i = 0; i < this.numParameters; i++) {
      const params = this.parameters

      // Shift parameter forward
      const forwardParams = [...params]
      forwardParams[i] += Math.PI / 2
      this.parameters = forwardParams
      const forwardOutput = this.forward(inputs)

      // Shift parameter backward
      const backwardParams = [...params]
      backwardParams[i] -= Math.PI / 2
      this.parameters = backwardParams
      const backwardOutput = this.forward(inputs)

      // Restore original parameters
      this.parameters = params

      // Calculate gradient for this parameter
      let paramGradient = 0
      for (let j = 0; j < outputGradients.length; j++) {
        paramGradient += (outputGradients[j] * (forwardOutput[j] - backwardOutput[j])) / 2
      }

      gradients.push(paramGradient)
    }

    return gradients
  }

  /**
   * Creates a copy of this attention mechanism
   */
  clone(): QuantumAttention {
    const clone = new QuantumAttention(this._inputDimension, this._numHeads, this._headDimension)
    clone.parameters = this.parameters
    return clone
  }
}

