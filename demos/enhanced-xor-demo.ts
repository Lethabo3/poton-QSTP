import { EnhancedQuantumNeuralNetwork, EnhancedLossFunctions } from "../neural/enhanced-quantum-neural-network"

/**
 * Demonstrates training an enhanced QNN on the XOR problem
 */
export class EnhancedXORDemo {
  private _network: EnhancedQuantumNeuralNetwork

  /**
   * Creates a new enhanced XOR demo
   */
  constructor() {
    // Create an enhanced QNN with 2 inputs, 1 hidden layer with 2 neurons, and 1 output
    this._network = new EnhancedQuantumNeuralNetwork({
      inputSize: 2,
      layerSizes: [2, 1],
      layerConfigs: [
        {
          neuronConfig: {
            numQubits: 3,
            encodingMethod: "angle",
            depth: 2,
            entanglement: "linear",
          },
          useAttention: true,
          attentionHeads: 1,
        },
        {
          neuronConfig: {
            numQubits: 3,
            encodingMethod: "angle",
            depth: 2,
            entanglement: "linear",
          },
        },
      ],
      useBatchNorm: true,
      useDropout: true,
      dropoutRate: 0.1,
      noiseResilience: true,
      noiseLevel: 0.02,
    })
  }

  /**
   * Gets the network
   */
  get network(): EnhancedQuantumNeuralNetwork {
    return this._network
  }

  /**
   * Trains the network on the XOR problem
   * @param epochs Number of epochs to train
   * @param learningRate Learning rate for training
   * @returns Array of loss values for each epoch
   */
  train(epochs = 100, learningRate = 0.05): number[] {
    // XOR training data
    const inputs = [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ]

    const targets = [[0], [1], [1], [0]]

    // Train the network with enhanced optimizer settings
    return this._network.train(inputs, targets, {
      epochs,
      batchSize: 4,
      optimizer: {
        learningRate,
        weightDecay: 0.0001,
        useLRScheduling: true,
        lrDecayFactor: 0.95,
        lrDecaySteps: 20,
      },
      lossFunction: EnhancedLossFunctions.MSE.loss,
      gradientFunction: EnhancedLossFunctions.MSE.gradient,
      verbose: true,
    })
  }

  /**
   * Tests the network on the XOR problem
   * @returns Object containing inputs, targets, and predictions
   */
  test(): { inputs: number[][]; targets: number[][]; predictions: number[][] } {
    // XOR test data
    const inputs = [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ]

    const targets = [[0], [1], [1], [0]]

    // Set network to evaluation mode
    this._network.training = false

    // Make predictions
    const predictions = inputs.map((input) => this._network.forward(input))

    // Restore training mode
    this._network.training = true

    return { inputs, targets, predictions }
  }

  /**
   * Visualizes the decision boundary of the network
   * @param resolution Number of points to sample in each dimension
   * @returns Grid of predictions for visualization
   */
  visualizeDecisionBoundary(resolution = 20): {
    x: number[]
    y: number[]
    z: number[][]
  } {
    const x: number[] = []
    const y: number[] = []
    const z: number[][] = []

    // Set network to evaluation mode
    this._network.training = false

    // Generate grid of points
    for (let i = 0; i < resolution; i++) {
      const xVal = i / (resolution - 1)
      x.push(xVal)
      z[i] = []

      for (let j = 0; j < resolution; j++) {
        const yVal = j / (resolution - 1)
        if (i === 0) {
          y.push(yVal)
        }

        // Make prediction
        const prediction = this._network.forward([xVal, yVal])[0]
        z[i][j] = prediction
      }
    }

    // Restore training mode
    this._network.training = true

    return { x, y, z }
  }
}

