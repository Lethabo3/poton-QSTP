import { XORDemo, BinaryClassificationDemo } from "./index"

/**
 * Runs the XOR demo
 */
async function runXORDemo(): Promise<void> {
  console.log("=== XOR Problem Demo ===")

  const demo = new XORDemo()

  console.log("Training QNN on XOR problem...")
  const losses = demo.train(100, 0.05)

  console.log("Final loss:", losses[losses.length - 1])

  console.log("Testing QNN on XOR problem...")
  const { inputs, targets, predictions } = demo.test()

  console.log("Results:")
  for (let i = 0; i < inputs.length; i++) {
    console.log(
      `Input: [${inputs[i].join(", ")}], Target: ${targets[i][0]}, Prediction: ${predictions[i][0].toFixed(4)}`,
    )
  }

  console.log("Decision boundary visualization data:")
  const { x, y, z } = demo.visualizeDecisionBoundary(5)
  console.log("x:", x)
  console.log("y:", y)
  console.log("z:", z.map((row) => row.map((val) => val.toFixed(2)).join(", ")).join("\n"))
}

/**
 * Runs the binary classification demo
 */
async function runBinaryClassificationDemo(): Promise<void> {
  console.log("\n=== Binary Classification Demo ===")

  const demo = new BinaryClassificationDemo(200, 0.1)

  console.log("Training QNN on binary classification problem...")
  const losses = demo.train(50, 0.01, 0.2)

  console.log("Final loss:", losses[losses.length - 1])

  console.log("Testing QNN on binary classification problem...")
  const { accuracy, predictions } = demo.test()

  console.log("Accuracy:", accuracy)

  // Compare with a hypothetical classical neural network
  const classicalAccuracy = 0.85 // Hypothetical accuracy
  const comparison = demo.compareWithClassical(classicalAccuracy)

  console.log("Comparison with classical neural network:")
  console.log("Quantum accuracy:", comparison.quantumAccuracy)
  console.log("Classical accuracy:", comparison.classicalAccuracy)
  console.log("Difference:", comparison.difference)

  console.log("Decision boundary visualization data available")
}

/**
 * Main function to run all demos
 */
async function main(): Promise<void> {
  console.log("Quantum Neural Network Demonstration")
  console.log("===================================")

  await runXORDemo()
  await runBinaryClassificationDemo()

  console.log("\nAll demos completed successfully!")
}

// Run the main function
main().catch((error) => {
  console.error("Error running demos:", error)
})

