import { QuantumLayer, type QuantumLayerConfig } from "./quantum-layer"

/**
 * Configuration options for a quantum neural network
 */
export interface QuantumNeuralNetworkConfig {
  /**
   * Number of input features
   */
  inputSize: number

  /**
   * Array of layer sizes (including output layer)
   */
  layerSizes: number[]

  /**
   * Configuration for each layer
   */
  layerConfigs?: Omit<QuantumLayerConfig, "inputSize" | "outputSize">[]
  
  /**
   * Memory configuration for temporal processing
   */
  memoryConfig?: {
    /**
     * Number of memory qubits per neuron
     */
    qubitsPerNeuron: number
    
    /**
     * Memory persistence factor (0-1)
     */
    persistence: number
    
    /**
     * Whether to use shared memory across neurons in a layer
     */
    sharedWithinLayer: boolean
    
    /**
     * Decoherence rate for quantum memory (0-1)
     */
    decoherenceRate?: number
  }
}

/**
 * Loss function type
 */
export type LossFunction = (predictions: number[], targets: number[]) => number

/**
 * Gradient function type
 */
export type GradientFunction = (predictions: number[], targets: number[]) => number[]

/**
 * Common loss functions
 */
export const LossFunctions = {
  /**
   * Mean squared error loss
   */
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

  /**
   * Binary cross-entropy loss
   */
  BCE: {
    loss: (predictions: number[], targets: number[]): number => {
      let sum = 0
      for (let i = 0; i < predictions.length; i++) {
        // Clip predictions to avoid log(0)
        const pred = Math.max(Math.min(predictions[i], 0.9999), 0.0001)
        sum += targets[i] * Math.log(pred) + (1 - targets[i]) * Math.log(1 - pred)
      }
      return -sum / predictions.length
    },
    gradient: (predictions: number[], targets: number[]): number[] => {
      return predictions.map((pred, i) => {
        // Clip predictions to avoid division by zero
        const p = Math.max(Math.min(pred, 0.9999), 0.0001)
        return (p - targets[i]) / (p * (1 - p) * predictions.length)
      })
    },
  },
}

/**
 * Optimizer configuration
 */
export interface OptimizerConfig {
  /**
   * Learning rate
   */
  learningRate: number

  /**
   * Beta1 parameter for Adam optimizer (momentum)
   */
  beta1?: number

  /**
   * Beta2 parameter for Adam optimizer (RMSProp)
   */
  beta2?: number

  /**
   * Epsilon parameter for Adam optimizer (numerical stability)
   */
  epsilon?: number
}

/**
 * Represents a quantum neural network with memory capabilities
 */
export class QuantumNeuralNetwork {
  private _layers: QuantumLayer[]
  private _config: QuantumNeuralNetworkConfig
  private _hasMemory: boolean

  // Optimizer state
  private _m: number[] = []
  private _v: number[] = []
  private _t = 0

  /**
   * Creates a new quantum neural network
   * @param config Configuration options for the network
   */
  constructor(config: QuantumNeuralNetworkConfig) {
    this._config = { ...config }
    this._hasMemory = !!config.memoryConfig && config.memoryConfig.qubitsPerNeuron > 0

    // Create layers
    this._layers = []
    let currentInputSize = config.inputSize

    for (let i = 0; i < config.layerSizes.length; i++) {
      const outputSize = config.layerSizes[i]
      const layerConfig = config.layerConfigs?.[i] || {}
      
      // Add memory configuration if specified
      const memoryConfig = config.memoryConfig ? {
        memoryQubits: config.memoryConfig.qubitsPerNeuron,
        memoryPersistence: config.memoryConfig.persistence,
        decoherenceRate: config.memoryConfig.decoherenceRate || 0.01
      } : {}
      
      this._layers.push(
        new QuantumLayer({
          inputSize: currentInputSize,
          outputSize,
          ...layerConfig,
          // Add memory configuration
          sharedMemory: config.memoryConfig?.sharedWithinLayer || false,
          neuronConfig: {
            ...layerConfig.neuronConfig,
            ...memoryConfig
          }
        }),
      )

      currentInputSize = outputSize
    }

    // Initialize optimizer state
    this._initializeOptimizerState()
  }

  /**
   * Gets the configuration of this network
   */
  get config(): QuantumNeuralNetworkConfig {
    return { ...this._config }
  }

  /**
   * Gets the layers in this network
   */
  get layers(): QuantumLayer[] {
    return [...this._layers]
  }
  
  /**
   * Checks if this network has memory capabilities
   */
  get hasMemory(): boolean {
    return this._hasMemory
  }

  /**
   * Gets all parameters of this network
   */
  get parameters(): number[] {
    return this._layers.flatMap((layer) => layer.parameters)
  }

  /**
   * Sets all parameters of this network
   */
  set parameters(params: number[]) {
    let offset = 0
    for (const layer of this._layers) {
      const numParams = layer.numParameters
      layer.parameters = params.slice(offset, offset + numParams)
      offset += numParams
    }
  }

  /**
   * Gets the number of parameters in this network
   */
  get numParameters(): number {
    return this._layers.reduce((sum, layer) => sum + layer.numParameters, 0)
  }

  /**
   * Initializes the optimizer state
   */
  private _initializeOptimizerState(): void {
    const numParams = this.numParameters
    this._m = Array(numParams).fill(0)
    this._v = Array(numParams).fill(0)
    this._t = 0
  }
  
  /**
   * Resets the memory state of all layers
   */
  resetMemory(): void {
    if (!this._hasMemory) return
    
    for (const layer of this._layers) {
      layer.resetMemory()
    }
  }

  /**
   * Performs forward pass through the network
   * @param inputs Input data
   * @returns Output values
   */
  forward(inputs: number[]): number[] {
    let currentOutputs = inputs

    for (const layer of this._layers) {
      currentOutputs = layer.forward(currentOutputs)
    }

    return currentOutputs
  }
  
  /**
   * Processes a sequence of inputs maintaining memory state
   * @param sequence Array of input vectors
   * @returns Array of output vectors for each input
   */
  forwardSequence(sequence: number[][]): number[][] {
    // Reset memory at the start of a new sequence if needed
    // We keep it here in case the user wants to manually control memory reset
    
    // Process each element in the sequence
    const outputs: number[][] = []
    
    for (const input of sequence) {
      // Forward pass for this time step
      outputs.push(this.forward(input))
    }
    
    return outputs
  }

  /**
   * Calculates the loss for the given inputs and targets
   * @param inputs Input data
   * @param targets Target values
   * @param lossFunction Loss function to use
   * @returns Loss value
   */
  calculateLoss(inputs: number[], targets: number[], lossFunction: LossFunction = LossFunctions.MSE.loss): number {
    const predictions = this.forward(inputs)
    return lossFunction(predictions, targets)
  }

  /**
   * Performs backpropagation to calculate gradients
   * @param inputs Input data
   * @param targets Target values
   * @param gradientFunction Gradient function for the loss
   * @returns Gradients for all parameters
   */
  backpropagate(
    inputs: number[],
    targets: number[],
    gradientFunction: GradientFunction = LossFunctions.MSE.gradient,
  ): number[] {
    // Forward pass
    const activations: number[][] = [inputs]
    let currentOutputs = inputs

    for (const layer of this._layers) {
      currentOutputs = layer.forward(currentOutputs)
      activations.push(currentOutputs)
    }

    // Calculate output gradients
    const outputGradients = gradientFunction(currentOutputs, targets)

    // Backpropagate through layers
    const allGradients: number[] = []
    let currentGradients = outputGradients

    for (let i = this._layers.length - 1; i >= 0; i--) {
      const layer = this._layers[i]
      const layerInputs = activations[i]

      const layerGradients = layer.calculateGradients(layerInputs, currentGradients)
      allGradients.unshift(...layerGradients)

      // For multi-layer networks, we would need to calculate input gradients
      // to propagate back to previous layers. This is simplified here.

      if (i > 0) {
        // This would be where we calculate gradients for the previous layer
        // For simplicity, we're not implementing full backpropagation through multiple layers
        // as we're using the parameter-shift rule for quantum gradients
        currentGradients = Array(this._layers[i - 1].outputSize).fill(0)
      }
    }

    return allGradients.reverse()
  }
  
  /**
   * Performs backpropagation through time for sequential data
   * @param sequence Input sequence
   * @param targetSequence Target sequence
   * @param gradientFunction Gradient function for the loss
   * @returns Gradients for all parameters
   */
  backpropagateSequence(
    sequence: number[][],
    targetSequence: number[][],
    gradientFunction: GradientFunction = LossFunctions.MSE.gradient,
  ): number[] {
    if (sequence.length !== targetSequence.length) {
      throw new Error("Input sequence and target sequence must have the same length")
    }
    
    // Reset memory state to ensure consistent results
    if (this.hasMemory) {
      this.resetMemory()
    }
    
    // Initialize gradients
    const totalGradients = Array(this.numParameters).fill(0)
    
    // Forward pass through the sequence
    const predictions: number[][] = []
    for (const input of sequence) {
      predictions.push(this.forward(input))
    }
    
    // Backward pass through the sequence (simplified BPTT)
    // In a true quantum system, we'd need to consider the full quantum state history
    
    // For each time step (in reverse)
    for (let t = sequence.length - 1; t >= 0; t--) {
      // Calculate gradients for this time step
      const gradients = this.backpropagate(sequence[t], targetSequence[t], gradientFunction)
      
      // Accumulate gradients
      for (let i = 0; i < totalGradients.length; i++) {
        totalGradients[i] += gradients[i]
      }
    }
    
    // Average the gradients across time steps
    return totalGradients.map(g => g / sequence.length)
  }

  /**
   * Updates parameters using Adam optimizer
   * @param gradients Gradients for all parameters
   * @param config Optimizer configuration
   */
  updateParameters(gradients: number[], config: OptimizerConfig): void {
    const { learningRate, beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8 } = config

    if (gradients.length !== this.numParameters) {
      throw new Error(`Expected ${this.numParameters} gradients, got ${gradients.length}`)
    }

    // Increment timestep
    this._t += 1

    // Update parameters using Adam optimizer
    const params = this.parameters
    const newParams: number[] = []

    for (let i = 0; i < params.length; i++) {
      // Update biased first moment estimate
      this._m[i] = beta1 * this._m[i] + (1 - beta1) * gradients[i]

      // Update biased second raw moment estimate
      this._v[i] = beta2 * this._v[i] + (1 - beta2) * gradients[i] * gradients[i]

      // Compute bias-corrected first moment estimate
      const mHat = this._m[i] / (1 - Math.pow(beta1, this._t))

      // Compute bias-corrected second raw moment estimate
      const vHat = this._v[i] / (1 - Math.pow(beta2, this._t))

      // Update parameters
      newParams[i] = params[i] - (learningRate * mHat) / (Math.sqrt(vHat) + epsilon)
    }

    // Set updated parameters
    this.parameters = newParams

    // Update layers
    let offset = 0
    for (const layer of this._layers) {
      const numParams = layer.numParameters
      layer.parameters = newParams.slice(offset, offset + numParams)
      offset += numParams
    }
  }

  /**
   * Trains the network on a batch of data
   * @param inputs Array of input data
   * @param targets Array of target values
   * @param config Optimizer configuration
   * @param lossFunction Loss function to use
   * @returns Average loss for the batch
   */
  trainBatch(
    inputs: number[][],
    targets: number[][],
    config: OptimizerConfig,
    lossFunction: LossFunction = LossFunctions.MSE.loss,
    gradientFunction: GradientFunction = LossFunctions.MSE.gradient,
  ): number {
    if (inputs.length !== targets.length) {
      throw new Error("Number of inputs must match number of targets")
    }

    if (inputs.length === 0) {
      return 0
    }

    // Calculate average gradients and loss across the batch
    let totalLoss = 0
    const totalGradients = Array(this.numParameters).fill(0)

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i]
      const target = targets[i]

      // Forward pass
      const prediction = this.forward(input)
      totalLoss += lossFunction(prediction, target)

      // Backward pass
      const gradients = this.backpropagate(input, target, gradientFunction)

      // Accumulate gradients
      for (let j = 0; j < totalGradients.length; j++) {
        totalGradients[j] += gradients[j]
      }
    }

    // Average gradients and loss
    const avgLoss = totalLoss / inputs.length
    const avgGradients = totalGradients.map((g) => g / inputs.length)

    // Update parameters
    this.updateParameters(avgGradients, config)

    return avgLoss
  }
  
  /**
   * Trains the network on sequential data
   * @param sequences Array of input sequences
   * @param targetSequences Array of target sequences
   * @param config Training configuration
   * @returns Array of loss values for each epoch
   */
  trainSequence(
    sequences: number[][][],
    targetSequences: number[][][],
    config: {
      epochs: number
      optimizer: OptimizerConfig
      lossFunction?: LossFunction
      gradientFunction?: GradientFunction
      resetMemoryBetweenSequences?: boolean
      validationSplit?: number
      earlyStoppingPatience?: number
      verbose?: boolean
    },
  ): number[] {
    const {
      epochs,
      optimizer,
      lossFunction = LossFunctions.MSE.loss,
      gradientFunction = LossFunctions.MSE.gradient,
      resetMemoryBetweenSequences = true,
      validationSplit = 0,
      earlyStoppingPatience = 0,
      verbose = true,
    } = config

    if (sequences.length !== targetSequences.length) {
      throw new Error("Number of sequences must match number of target sequences")
    }
    
    // Split data into training and validation sets
    const numValidation = Math.floor(sequences.length * validationSplit)
    const numTraining = sequences.length - numValidation
    
    const trainingSequences = sequences.slice(0, numTraining)
    const trainingTargets = targetSequences.slice(0, numTraining)
    
    const validationSequences = sequences.slice(numTraining)
    const validationTargets = targetSequences.slice(numTraining)
    
    // Initialize variables for training
    const losses: number[] = []
    let bestValidationLoss = Number.POSITIVE_INFINITY
    let patienceCounter = 0
    
    // Train for the specified number of epochs
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
      
      // Train on each sequence
      for (let i = 0; i < numTraining; i++) {
        const sequenceIndex = indices[i]
        const sequence = trainingSequences[sequenceIndex]
        const targetSequence = trainingTargets[sequenceIndex]
        
        // Reset memory state between sequences if specified
        if (resetMemoryBetweenSequences) {
          this.resetMemory()
        }
        
        // Calculate gradients for this sequence
        const gradients = this.backpropagateSequence(sequence, targetSequence, gradientFunction)
        
        // Update parameters
        this.updateParameters(gradients, optimizer)
        
        // Calculate sequence loss
        let sequenceLoss = 0
        this.resetMemory() // Reset memory to get consistent loss measurement
        const predictions = this.forwardSequence(sequence)
        
        for (let t = 0; t < sequence.length; t++) {
          sequenceLoss += lossFunction(predictions[t], targetSequence[t])
        }
        
        sequenceLoss /= sequence.length
        totalLoss += sequenceLoss
      }
      
      const avgTrainingLoss = totalLoss / numTraining
      losses.push(avgTrainingLoss)
      
      // Calculate validation loss
      let validationLoss = 0
      if (numValidation > 0) {
        for (let i = 0; i < numValidation; i++) {
          this.resetMemory()
          const predictions = this.forwardSequence(validationSequences[i])
          
          let sequenceLoss = 0
          for (let t = 0; t < predictions.length; t++) {
            sequenceLoss += lossFunction(predictions[t], validationTargets[i][t])
          }
          
          validationLoss += sequenceLoss / predictions.length
        }
        validationLoss /= numValidation
      }
      
      // Print progress
      if (verbose) {
        if (numValidation > 0) {
          console.log(
            `Epoch ${epoch + 1}/${epochs}, Loss: ${avgTrainingLoss.toFixed(6)}, Validation Loss: ${validationLoss.toFixed(6)}`,
          )
        } else {
          console.log(`Epoch ${epoch + 1}/${epochs}, Loss: ${avgTrainingLoss.toFixed(6)}`)
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
  }

  /**
   * Trains the network on a dataset
   * @param inputs Array of input data
   * @param targets Array of target values
   * @param config Training configuration
   * @returns Array of loss values for each epoch
   */
  train(
    inputs: number[][],
    targets: number[][],
    config: {
      epochs: number
      batchSize: number
      optimizer: OptimizerConfig
      lossFunction?: LossFunction
      gradientFunction?: GradientFunction
      validationSplit?: number
      earlyStoppingPatience?: number
      verbose?: boolean
    },
  ): number[] {
    const {
      epochs,
      batchSize,
      optimizer,
      lossFunction = LossFunctions.MSE.loss,
      gradientFunction = LossFunctions.MSE.gradient,
      validationSplit = 0,
      earlyStoppingPatience = 0,
      verbose = true,
    } = config

    if (inputs.length !== targets.length) {
      throw new Error("Number of inputs must match number of targets")
    }

    // Reset memory state before training
    if (this.hasMemory) {
      this.resetMemory()
    }

    // Split data into training and validation sets
    const numValidation = Math.floor(inputs.length * validationSplit)
    const numTraining = inputs.length - numValidation

    const trainingInputs = inputs.slice(0, numTraining)
    const trainingTargets = targets.slice(0, numTraining)

    const validationInputs = inputs.slice(numTraining)
    const validationTargets = targets.slice(numTraining)

    // Initialize variables for training
    const losses: number[] = []
    let bestValidationLoss = Number.POSITIVE_INFINITY
    let patienceCounter = 0

    // Train for the specified number of epochs
    for (let epoch = 0; epoch < epochs; epoch++) {
      // Shuffle training data
      const indices = Array(numTraining)
        .fill(0)
        .map((_, i) => i)
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[indices[i], indices[j]] = [indices[j], indices[i]]
      }

      // Train in batches
      let totalLoss = 0
      for (let i = 0; i < numTraining; i += batchSize) {
        const batchIndices = indices.slice(i, i + batchSize)
        const batchInputs = batchIndices.map((idx) => trainingInputs[idx])
        const batchTargets = batchIndices.map((idx) => trainingTargets[idx])

        totalLoss +=
          this.trainBatch(batchInputs, batchTargets, optimizer, lossFunction, gradientFunction) * batchIndices.length
      }

      const avgTrainingLoss = totalLoss / numTraining
      losses.push(avgTrainingLoss)

      // Calculate validation loss
      let validationLoss = 0
      if (numValidation > 0) {
        // Reset memory for validation to get consistent results
        if (this.hasMemory) {
          this.resetMemory()
        }
        
        for (let i = 0; i < numValidation; i++) {
          const prediction = this.forward(validationInputs[i])
          validationLoss += lossFunction(prediction, validationTargets[i])
        }
        validationLoss /= numValidation
      }

      // Print progress
      if (verbose) {
        if (numValidation > 0) {
          console.log(
            `Epoch ${epoch + 1}/${epochs}, Loss: ${avgTrainingLoss.toFixed(6)}, Validation Loss: ${validationLoss.toFixed(6)}`,
          )
        } else {
          console.log(`Epoch ${epoch + 1}/${epochs}, Loss: ${avgTrainingLoss.toFixed(6)}`)
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
  }

  /**
   * Creates a copy of this neural network
   */
  clone(): QuantumNeuralNetwork {
    const network = new QuantumNeuralNetwork(this._config)
    network.parameters = this.parameters
    return network
  }
}

