/**
 * Oracle - Sender component for PotonQ
 *
 * This module simulates a blockchain oracle that securely transmits
 * price data using the PotonQ quantum secure transmission pipeline.
 */

import { PotonQ } from "./potonq"
import type { StateVector } from "./quantum/state-vector"

export class Oracle {
  private _potonQ: PotonQ

  /**
   * Creates a new Oracle instance
   * @param numDataQubits Number of data qubits to use
   * @param numAncillaQubits Number of ancilla (memory) qubits to use
   */
  constructor(numDataQubits = 5, numAncillaQubits = 1) {
    // Initialize PotonQ with a random seed
    this._potonQ = new PotonQ({
      numDataQubits,
      numAncillaQubits,
    })
  }

  /**
   * Gets the PotonQ instance used by this oracle
   */
  get potonQ(): PotonQ {
    return this._potonQ
  }

  /**
   * Prepares price data for transmission
   * @param prices Array of price values
   * @returns Object containing the scrambled state and verification hash
   */
  prepareTransmission(prices: number[]): {
    scrambledState: StateVector
    verificationHash: string
    seed: string
  } {
    console.log("Oracle: Preparing price data for transmission...")
    console.log("Oracle: Input prices:", prices)

    // Generate verification hash
    const verificationHash = this._potonQ.generateVerificationHash(prices)
    console.log("Oracle: Generated verification hash:", verificationHash)

    // Encode prices into quantum state
    const encodedState = this._potonQ.encodeData(prices)
    console.log("Oracle: Encoded prices into quantum state")

    // Scramble the quantum state
    const scrambledState = this._potonQ.scramble(encodedState)
    console.log("Oracle: Scrambled quantum state for secure transmission")

    // Ensure the state vector is properly initialized for visualization
    if (!scrambledState._stateVector || scrambledState._stateVector.length === 0) {
      console.warn("Oracle: State vector is empty, initializing with default values")
      scrambledState._stateVector = Array(1 << scrambledState._numQubits)
        .fill(null)
        .map((_, i) => (i === 0 ? { real: 1, imag: 0 } : { real: 0, imag: 0 }))
    }

    // Return the scrambled state and verification hash
    return {
      scrambledState,
      verificationHash,
      seed: this._potonQ.seed,
    }
  }

  /**
   * Simulates sending the transmission to a smart contract
   * @param prices Array of price values
   * @returns Transmission data
   */
  sendTransmission(prices: number[]): {
    scrambledState: StateVector
    verificationHash: string
    seed: string
  } {
    const transmission = this.prepareTransmission(prices)
    console.log("Oracle: Sending transmission to smart contract...")

    // Ensure the state vector is properly initialized for visualization
    if (
      !transmission.scrambledState._stateVector ||
      !Array.isArray(transmission.scrambledState._stateVector) ||
      transmission.scrambledState._stateVector.length === 0
    ) {
      console.log("Oracle: Initializing state vector for visualization")

      // Create a default state vector with random values for visualization
      const numQubits = transmission.scrambledState._numQubits || 6 // Default to 6 qubits if not specified
      const dimension = 1 << numQubits

      transmission.scrambledState._stateVector = Array(dimension)
        .fill(null)
        .map(() => {
          return {
            real: Math.random() * 0.5,
            imag: Math.random() * 0.5,
          }
        })

      // Normalize the state vector
      let sumSquared = 0
      for (const amplitude of transmission.scrambledState._stateVector) {
        sumSquared += amplitude.real * amplitude.real + amplitude.imag * amplitude.imag
      }

      const normalizationFactor = sumSquared > 0 ? 1 / Math.sqrt(sumSquared) : 1
      transmission.scrambledState._stateVector = transmission.scrambledState._stateVector.map((amplitude) => ({
        real: amplitude.real * normalizationFactor,
        imag: amplitude.imag * normalizationFactor,
      }))
    }

    return transmission
  }
}

