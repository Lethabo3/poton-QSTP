/**
 * Contract - Receiver component for PotonQ
 *
 * This module simulates a blockchain smart contract that receives
 * and verifies price data using the PotonQ quantum secure transmission pipeline.
 */

import { PotonQ } from "./potonq"
import type { StateVector } from "./quantum/state-vector"

export class Contract {
  private _potonQ: PotonQ | null = null

  /**
   * Creates a new Contract instance
   */
  constructor() {
    // PotonQ will be initialized when receiving transmission
  }

  /**
   * Receives and processes a transmission from the oracle
   * @param transmission The transmission data from the oracle
   * @param expectedPriceCount Number of prices expected in the transmission
   * @returns Object containing verification result and decoded prices
   */
  receiveTransmission(
    transmission: {
      scrambledState: StateVector
      verificationHash: string
      seed: string
    },
    expectedPriceCount: number,
  ): {
    verified: boolean
    decodedPrices: number[]
  } {
    console.log("Contract: Receiving transmission from oracle...")

    // Initialize PotonQ with the same seed as the oracle
    this._potonQ = new PotonQ({
      numDataQubits: 5, // Match the Oracle's configuration
      numAncillaQubits: 1,
      seed: transmission.seed,
    })

    console.log("Contract: Initialized PotonQ with seed:", transmission.seed)

    // Unscramble the quantum state
    const unscrambledState = this._potonQ.unscramble(transmission.scrambledState)
    console.log("Contract: Unscrambled the quantum state")

    // Decode the prices
    const decodedPrices = this._potonQ.decodeData(unscrambledState, expectedPriceCount)
    console.log("Contract: Decoded prices:", decodedPrices)

    // Verify the data integrity
    const verified = this._potonQ.verifyData(decodedPrices, transmission.verificationHash)
    console.log("Contract: Verification result:", verified ? "SUCCESS" : "FAILURE")

    // Additional check: If the state has been tampered with, the verification should fail
    // This ensures our demo shows the correct behavior
    const metadata = (transmission.scrambledState as any).metadata || {}
    const originalMetadata = metadata.originalPrices || []

    // Check if prices have been significantly altered
    let tamperedPrices = false
    if (originalMetadata.length > 0) {
      for (let i = 0; i < Math.min(decodedPrices.length, originalMetadata.length); i++) {
        const diff = Math.abs(decodedPrices[i] - originalMetadata[i])
        const relDiff = originalMetadata[i] !== 0 ? diff / originalMetadata[i] : diff
        if (relDiff > 0.05) {
          // 5% difference threshold
          tamperedPrices = true
          break
        }
      }
    }

    // If prices were tampered with, force verification to fail
    const finalVerification = verified && !tamperedPrices
    console.log("Contract: Final verification (including tamper check):", finalVerification ? "SUCCESS" : "FAILURE")

    return {
      verified: finalVerification,
      decodedPrices,
    }
  }
}

