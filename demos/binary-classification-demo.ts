import { QuantumNeuralNetwork, LossFunctions } from "../neural/quantum-neural-network"

/**
 * Generates a non-linearly separable dataset (moons)
 * @param numSamples Number of samples to generate
 * @param noise Amount of noise to add
 * @returns Object containing inputs and targets
 */
export function generateMoonsDataset(numSamples = 100, noise = 0.1): { inputs: number[][]; targets: number[][] } {
  const inputs: number[][] = []
  const targets: number[][] = []

  const halfSamples = Math.floor(numSamples / 2)

  // Generate first moon
  for (let i = 0; i < halfSamples; i++) {
    const angle = (Math.PI * i) / halfSamples
    const x = Math.cos(angle)
    const y = Math.sin(angle)

    // Add noise
    const noiseX = (Math.random() * 2 - 1) * noise
    const noiseY = (Math.random() * 2 - 1) * noise

    inputs.push([x + noiseX, y + noiseY])
    targets.push([0])
  }

  // Generate second moon
  for (let i = 0; i < numSamples - halfSamples; i++) {
    const angle = (Math.PI * i) / (numSamples - halfSamples)
    const x = 1 - Math.cos(angle)
    const y = 1 - Math.sin(angle) - 0.5

    // Add noise
    const noiseX = (Math.random() * 2 - 1) * noise
    const noiseY = (Math.random() * 2 - 1) * noise

    inputs.push([x + noiseX, y + noiseY])
    targets.push([1])
  }

  // Shuffle the dataset
  const indices = Array(numSamples)
    .fill(0)
    .map((_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }

  const shuffledInputs = indices.map((i) => inputs[i])
  const shuffledTargets = indices.map((i) => targets[i])

  return { inputs: shuffledInputs, targets: shuffledTargets }
}

/**
 * Demonstrates training a QNN on a binary classification problem
 */
export class BinaryClassificationDemo {
  private _network: QuantumNeuralNetwork
  private _dataset: { inputs: number[][]; targets: number[][] }

  /**
   * Creates a new binary classification demo
   * @param numSamples Number of samples in the dataset
   * @param noise Amount of noise to add to the dataset
   */
  constructor(numSamples = 100, noise = 0.1) {
    // Generate dataset
    this._dataset = generateMoonsDataset(numSamples, noise)

    // Create a QNN with 2 inputs, 1 hidden layer with 4 neurons, and 1 output
    this._network = new QuantumNeuralNetwork({
      inputSize: 2,
      layerSizes: [4, 1],
      layerConfigs: [
        {
          neuronConfig: {
            numQubits: 3,
            encodingMethod: "angle",
            depth: 3,
            entanglement: "all",
          },
        },
        {
          neuronConfig: {
            numQubits: 5,
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
   * Gets the dataset
   */
  get dataset(): { inputs: number[][]; targets: number[][] } {
    return {
      inputs: [...this._dataset.inputs],
      targets: [...this._dataset.targets],
    }
  }

  /**
   * Normalizes the dataset to [0, 1] range
   */
  normalizeDataset(): void {
    // Find min and max values for each feature
    const numFeatures = this._dataset.inputs[0].length
    const min: number[] = Array(numFeatures).fill(Number.POSITIVE_INFINITY)
    const max: number[] = Array(numFeatures).fill(Number.NEGATIVE_INFINITY)

    for (const input of this._dataset.inputs) {
      for (let i = 0; i < numFeatures; i++) {
        min[i] = Math.min(min[i], input[i])
        max[i] = Math.max(max[i], input[i])
      }
    }

    // Normalize inputs
    for (const input of this._dataset.inputs) {
      for (let i = 0; i < numFeatures; i++) {
        input[i] = (input[i] - min[i]) / (max[i] - min[i])
      }
    }
  }

  /**
   * Trains the network on the binary classification problem
   * @param epochs Number of epochs to train
   * @param learningRate Learning rate for training
   * @param validationSplit Fraction of data to use for validation
   * @returns Array of loss values for each epoch
   */
  train(epochs = 100, learningRate = 0.01, validationSplit = 0.2): number[] {
    // Normalize the dataset
    this.normalizeDataset()

    // Train the network
    return this._network.train(this._dataset.inputs, this._dataset.targets, {
      epochs,
      batchSize: 10,
      optimizer: { learningRate },
      lossFunction: LossFunctions.BCE.loss,
      gradientFunction: LossFunctions.BCE.gradient,
      validationSplit,
      earlyStoppingPatience: 10,
      verbose: true,
    })
  }

  /**
   * Tests the network on the binary classification problem
   * @param threshold Classification threshold (default: 0.5)
   * @returns Object containing accuracy and predictions
   */
  test(threshold = 0.5): {
    accuracy: number
    predictions: { input: number[]; target: number; prediction: number; correct: boolean }[]
  } {
    const results = this._dataset.inputs.map((input, i) => {
      const target = this._dataset.targets[i][0]
      const rawPrediction = this._network.forward(input)[0]
      const prediction = rawPrediction >= threshold ? 1 : 0
      const correct = prediction === target

      return { input, target, prediction, correct }
    })

    const accuracy = results.filter((r) => r.correct).length / results.length

    return { accuracy, predictions: results }
  }

  /**
   * Visualizes the decision boundary of the network
   * @param resolution Number of points to sample in each dimension
   * @param threshold Classification threshold (default: 0.5)
   * @returns Grid of predictions for visualization
   */
  visualizeDecisionBoundary(
    resolution = 50,
    threshold = 0.5,
  ): {
    x: number[]
    y: number[]
    z: number[][]
    dataPoints: { x: number; y: number; class: number }[]
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
        z[i][j] = prediction >= threshold ? 1 : 0
      }
    }

    // Extract data points for visualization
    const dataPoints = this._dataset.inputs.map((input, i) => ({
      x: input[0],
      y: input[1],
      class: this._dataset.targets[i][0],
    }))

    return { x, y, z, dataPoints }
  }

  /**
   * Compares the QNN with a classical neural network
   * @param classicalAccuracy Accuracy of a classical neural network
   * @returns Comparison results
   */
  compareWithClassical(classicalAccuracy: number): {
    quantumAccuracy: number
    classicalAccuracy: number
    difference: number
  } {
    const { accuracy: quantumAccuracy } = this.test()
    const difference = quantumAccuracy - classicalAccuracy

    return {
      quantumAccuracy,
      classicalAccuracy,
      difference,
    }
  }
}

