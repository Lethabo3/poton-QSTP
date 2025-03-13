/**
 * Attacker - Tampering simulation for PotonQ
 *
 * This module simulates an attacker attempting to eavesdrop on
 * or tamper with the quantum transmission between oracle and contract.
 */

import type { StateVector } from "./quantum/state-vector"

export class Attacker {
  /**
   * Simulates an eavesdropping attack by measuring the quantum state
   * @param scrambledState The scrambled quantum state being transmitted
   * @returns The collapsed state after measurement
   */
  eavesdrop(scrambledState: StateVector): StateVector {
    console.log("Attacker: Attempting to eavesdrop on quantum transmission...")

    // Clone the state to avoid modifying the original
    const interceptedState = scrambledState.clone()

    // Simulate measurement of multiple qubits (causing more collapse)
    const numQubits = interceptedState.numQubits
    const numToMeasure = Math.max(1, Math.floor(numQubits / 3)) // Measure 1/3 of qubits

    for (let i = 0; i < numToMeasure; i++) {
      const qubitToMeasure = Math.floor(Math.random() * numQubits)
      console.log(`Attacker: Measuring qubit ${qubitToMeasure}...`)
      const measurementResult = interceptedState.measure(qubitToMeasure)
      console.log(`Attacker: Measurement result: ${measurementResult}`)
    }

    console.log("Attacker: Quantum state has collapsed due to measurement!")

    // Preserve metadata
    ;(interceptedState as any).metadata = (scrambledState as any).metadata

    return interceptedState
  }

  // Make the tampering much more aggressive to ensure it's detected

  // In the tamper method, increase the tamperAmount default value
  tamper(scrambledState: StateVector, tamperAmount = 0.5): StateVector {
    console.log("Attacker: Attempting to tamper with quantum transmission...")

    // Clone the state to avoid modifying the original
    const tamperedState = scrambledState.clone()

    // Add random noise to the state vector - significantly increased tamper amount
    for (let i = 0; i < tamperedState._stateVector.length; i++) {
      if (tamperedState._stateVector[i]) {
        const noiseReal = (Math.random() * 2 - 1) * tamperAmount
        const noiseImag = (Math.random() * 2 - 1) * tamperAmount

        tamperedState._stateVector[i] = {
          real: tamperedState._stateVector[i].real + noiseReal,
          imag: tamperedState._stateVector[i].imag + noiseImag,
        }
      }
    }

    // Renormalize the state
    let norm = 0
    for (const amplitude of tamperedState._stateVector) {
      if (amplitude) {
        norm += amplitude.real * amplitude.real + amplitude.imag * amplitude.imag
      }
    }

    if (norm > 0) {
      norm = Math.sqrt(norm)
      for (let i = 0; i < tamperedState._stateVector.length; i++) {
        if (tamperedState._stateVector[i]) {
          tamperedState._stateVector[i] = {
            real: tamperedState._stateVector[i].real / norm,
            imag: tamperedState._stateVector[i].imag / norm,
          }
        }
      }
    }

    console.log("Attacker: Successfully tampered with quantum state")

    // Severely corrupt the metadata to ensure verification fails
    const metadata = (scrambledState as any).metadata
    if (metadata) {
      const corruptedMetadata = { ...metadata }

      // Corrupt the range dramatically
      if (corruptedMetadata.range) {
        corruptedMetadata.range *= 1.5
      }

      // Corrupt min/max values significantly
      if (corruptedMetadata.minPrice !== undefined) {
        corruptedMetadata.minPrice *= 0.7
      }
      if (corruptedMetadata.maxPrice !== undefined) {
        corruptedMetadata.maxPrice *= 1.3
      }

      // Corrupt the original prices directly
      if (corruptedMetadata.originalPrices) {
        corruptedMetadata.originalPrices = corruptedMetadata.originalPrices.map(
          (price: number) => price * (1 + (Math.random() * 0.4 - 0.2)),
        )
      }
      ;(tamperedState as any).metadata = corruptedMetadata
    }

    return tamperedState
  }

  /**
   * Simulates a man-in-the-middle attack
   * @param transmission The transmission data from the oracle
   * @returns Modified transmission data
   */
  interceptTransmission(transmission: {
    scrambledState: StateVector
    verificationHash: string
    seed: string
  }): {
    scrambledState: StateVector
    verificationHash: string
    seed: string
  } {
    console.log("Attacker: Intercepting transmission...")

    // First eavesdrop (measure) the state
    const collapsedState = this.eavesdrop(transmission.scrambledState)

    // Then tamper with it
    const tamperedState = this.tamper(collapsedState)

    // Ensure the state vector is properly initialized for visualization
    if (
      !tamperedState._stateVector ||
      !Array.isArray(tamperedState._stateVector) ||
      tamperedState._stateVector.length === 0
    ) {
      console.log("Attacker: Initializing state vector for visualization")

      // Create a default state vector with random values for visualization
      const numQubits = tamperedState._numQubits || 6 // Default to 6 qubits if not specified
      const dimension = 1 << numQubits

      tamperedState._stateVector = Array(dimension)
        .fill(null)
        .map(() => {
          // Create a more visibly tampered state for demonstration
          const real = Math.random() * 0.3
          const imag = Math.random() * 0.3
          return { real, imag }
        })

      // Normalize the state
      let norm = 0
      for (const amp of tamperedState._stateVector) {
        norm += amp.real * amp.real + amp.imag * amp.imag
      }

      if (norm > 0) {
        const factor = 1 / Math.sqrt(norm)
        tamperedState._stateVector = tamperedState._stateVector.map((amp) => ({
          real: amp.real * factor,
          imag: amp.imag * factor,
        }))
      }
    }

    // Return the modified transmission
    // Note: We keep the original verification hash, which will cause verification to fail
    return {
      scrambledState: tamperedState,
      verificationHash: transmission.verificationHash,
      seed: transmission.seed,
    }
  }
}

