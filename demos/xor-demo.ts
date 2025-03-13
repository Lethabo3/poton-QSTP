import { QuantumNeuralNetwork, LossFunctions } from "../neural/quantum-neural-network"

/**
 * Demonstrates training a QNN on the XOR problem
 */
export class XORDemo {
  private _network: QuantumNeuralNetwork

  /**
   * Creates a new XOR demo
   */
  constructor() {
    // Create a QNN with 2 inputs, 1 hidden layer with 2 neurons, and 1 output
    this._network = new QuantumNeuralNetwork({
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
    })
  }

  /**
   * Gets the network
   */
  get network(): QuantumNeuralNetwork {
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

    // Train the network
    return this._network.train(inputs, targets, {
      epochs,
      batchSize: 4,
      optimizer: { learningRate },
      lossFunction: LossFunctions.MSE.loss,
      gradientFunction: LossFunctions.MSE.gradient,
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

    // Make predictions
    const predictions = inputs.map((input) => this._network.forward(input))

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

    return { x, y, z }
  }
}

