/**
 * PotonQ Demo - Demonstrates the Quantum Secure Transmission Pipeline
 *
 * This file shows how the PotonQ system works, including:
 * 1. Oracle sending price data
 * 2. Contract receiving and verifying the data
 * 3. Attacker attempting to tamper with the transmission
 */

import { Oracle } from "./oracle"
import { Contract } from "./contract"
import { Attacker } from "./attacker"

// Sample price data
const prices = [100, 102, 101, 103, 104]

// Demo 1: Successful transmission without tampering
function demoSuccessfulTransmission() {
  console.log("\n=== DEMO 1: SUCCESSFUL TRANSMISSION ===\n")

  // Create oracle and contract
  const oracle = new Oracle(3, 1) // 3 data qubits, 1 ancilla qubit
  const contract = new Contract()

  // Oracle sends transmission
  const transmission = oracle.sendTransmission(prices)

  // Contract receives and verifies transmission
  const result = contract.receiveTransmission(transmission, prices.length)

  console.log("\nResult:")
  console.log("Verification:", result.verified ? "SUCCESS" : "FAILURE")
  console.log("Original prices:", prices)
  console.log("Decoded prices:", result.decodedPrices)
}

// Demo 2: Failed transmission due to eavesdropping
function demoEavesdroppingAttack() {
  console.log("\n=== DEMO 2: EAVESDROPPING ATTACK ===\n")

  // Create oracle, contract, and attacker
  const oracle = new Oracle(3, 1)
  const contract = new Contract()
  const attacker = new Attacker()

  // Oracle sends transmission
  const transmission = oracle.sendTransmission(prices)

  // Attacker intercepts and eavesdrops
  const interceptedTransmission = attacker.interceptTransmission(transmission)

  // Contract receives and verifies tampered transmission
  const result = contract.receiveTransmission(interceptedTransmission, prices.length)

  console.log("\nResult:")
  console.log("Verification:", result.verified ? "SUCCESS" : "FAILURE")
  console.log("Original prices:", prices)
  console.log("Decoded prices:", result.decodedPrices)
  console.log("Tampering detected:", !result.verified)
}

// Run the demos
demoSuccessfulTransmission()
demoEavesdroppingAttack()

