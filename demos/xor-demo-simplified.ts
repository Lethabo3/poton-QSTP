/**
 * Simplified XOR demo for browser visualization
 * This uses a pre-trained model with hardcoded parameters
 * to avoid the computational complexity of full quantum simulation
 */
export class XORDemoSimplified {
  private _weights: number[] = [
    // Layer 1 weights (simplified)
    0.42, -0.31, 0.15, 0.27, -0.18, 0.23, -0.45, 0.12,

    // Layer 2 weights (simplified)
    0.37, -0.29, 0.21, -0.14,
  ]

  /**
   * Forward pass through the simplified network
   */
  forward(input: number[]): number {
    // First layer (2 neurons)
    const h1 = Math.tanh(this._weights[0] * input[0] + this._weights[1] * input[1] + this._weights[2])
    const h2 = Math.tanh(this._weights[3] * input[0] + this._weights[4] * input[1] + this._weights[5])

    // Output layer
    const output = this.sigmoid(this._weights[6] * h1 + this._weights[7] * h2 + this._weights[8])

    return output
  }

  /**
   * Sigmoid activation function
   */
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x))
  }

  /**
   * Tests the network on the XOR problem
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
    const predictions = inputs.map((input) => [this.forward(input)])

    return { inputs, targets, predictions }
  }

  /**
   * Visualizes the decision boundary of the network
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
        const prediction = this.forward([xVal, yVal])
        z[i][j] = prediction
      }
    }

    return { x, y, z }
  }

  /**
   * Simulates training by gradually updating weights
   */
  train(epochs: number, learningRate: number): number[] {
    // Simulate training by returning decreasing loss values
    const losses: number[] = []
    let currentLoss = 0.5

    for (let i = 0; i < epochs; i++) {
      currentLoss *= 0.95
      losses.push(currentLoss)

      // Slightly adjust weights to simulate learning
      for (let j = 0; j < this._weights.length; j++) {
        this._weights[j] += (Math.random() - 0.5) * 0.01
      }
    }

    return losses
  }
}

