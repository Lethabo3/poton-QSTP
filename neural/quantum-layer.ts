import { QuantumNeuron, type QuantumNeuronConfig } from "./quantum-neuron"
import { scale, add, type Complex } from "../utils/complex-utils"

export interface QuantumLayerConfig {
  inputSize: number
  outputSize: number
  neuronConfig?: Omit<QuantumNeuronConfig, "inputSize">
  sharedMemory?: boolean
  memoryEntanglement?: number
}

export class QuantumLayer {
  private _neurons: QuantumNeuron[]
  private _config: Required<QuantumLayerConfig>
  private _hasSharedMemory: boolean
  private _lastForwardTime = 0

  constructor(config: QuantumLayerConfig) {
    this._config = {
      ...config,
      sharedMemory: config.sharedMemory ?? false,
      memoryEntanglement: config.memoryEntanglement ?? 0.3,
      neuronConfig: config.neuronConfig ?? {},
    }

    this._hasSharedMemory = this._config.sharedMemory && (this._config.neuronConfig?.memoryQubits ?? 0) > 0

    this._neurons = Array(config.outputSize)
      .fill(0)
      .map(
        () =>
          new QuantumNeuron({
            inputSize: config.inputSize,
            ...(config.neuronConfig || {}),
          }),
      )
  }

  get config(): Required<QuantumLayerConfig> {
    return { ...this._config }
  }

  get inputSize(): number {
    return this._config.inputSize
  }

  get outputSize(): number {
    return this._config.outputSize
  }

  get neurons(): QuantumNeuron[] {
    return [...this._neurons]
  }

  get hasMemory(): boolean {
    return this._neurons.some((neuron) => neuron.hasMemory)
  }

  get usesSharedMemory(): boolean {
    return this._hasSharedMemory
  }

  get parameters(): number[] {
    return this._neurons.flatMap((neuron) => neuron.parameters)
  }

  set parameters(params: number[]) {
    let offset = 0
    for (const neuron of this._neurons) {
      const numParams = neuron.numParameters
      neuron.parameters = params.slice(offset, offset + numParams)
      offset += numParams
    }
  }

  get numParameters(): number {
    return this._neurons.reduce((sum, neuron) => sum + neuron.numParameters, 0)
  }

  private _synchronizeMemory(): void {
    if (!this._hasSharedMemory || this._neurons.length <= 1) return

    const allMemoryStates = this._neurons.map((neuron) => neuron.memoryState)

    if (allMemoryStates.some((states) => states.length === 0)) return

    for (let i = 0; i < this._neurons.length; i++) {
      const neuron = this._neurons[i]
      const currentState = allMemoryStates[i]

      if (!neuron.hasMemory || currentState.length === 0) continue

      for (let m = 0; m < currentState.length; m++) {
        let entangledState: Complex = { ...currentState[m] }
        const entanglementFactor = this._config.memoryEntanglement / (this._neurons.length - 1)

        for (let j = 0; j < this._neurons.length; j++) {
          if (i === j) continue

          const otherState = allMemoryStates[j]
          if (otherState.length > m) {
            entangledState = add(
              scale(entangledState, 1 - entanglementFactor),
              scale(otherState[m], entanglementFactor),
            )
          }
        }
        ;(this._neurons[i] as any)._memoryState[m] = entangledState
      }
    }
  }

  forward(inputs: number[]): number[] {
    if (inputs.length !== this.inputSize) {
      throw new Error(`Expected ${this.inputSize} inputs, got ${inputs.length}`)
    }

    const outputs = this._neurons.map((neuron) => neuron.forward(inputs))

    if (this._hasSharedMemory) {
      const currentTime = Date.now()
      if (currentTime - this._lastForwardTime > 100) {
        this._synchronizeMemory()
        this._lastForwardTime = currentTime
      }
    }

    return outputs
  }

  calculateGradients(inputs: number[], outputGradients: number[]): number[] {
    if (outputGradients.length !== this.outputSize) {
      throw new Error(`Expected ${this.outputSize} output gradients, got ${outputGradients.length}`)
    }

    return this._neurons.flatMap((neuron, i) => {
      const neuronGradients = neuron.calculateGradients(inputs)
      return neuronGradients.map((g) => g * outputGradients[i])
    })
  }

  updateParameters(gradients: number[], learningRate: number): void {
    if (gradients.length !== this.numParameters) {
      throw new Error(`Expected ${this.numParameters} gradients, got ${gradients.length}`)
    }

    let offset = 0
    for (const neuron of this._neurons) {
      const numParams = neuron.numParameters
      neuron.updateParameters(gradients.slice(offset, offset + numParams), learningRate)
      offset += numParams
    }
  }

  resetMemory(): void {
    for (const neuron of this._neurons) {
      neuron.resetMemory()
    }
  }

  clone(): QuantumLayer {
    const layer = new QuantumLayer(this._config)
    layer.parameters = this.parameters
    return layer
  }
}

