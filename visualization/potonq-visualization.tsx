"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { PlayIcon, RefreshCwIcon, ShieldIcon, AlertTriangleIcon, CheckCircle2Icon, XCircleIcon } from "lucide-react"
import { Oracle } from "../oracle"
import { Contract } from "../contract"
import { Attacker } from "../attacker"
import { cn } from "@/lib/utils"

export function PotonQVisualization() {
  // Sample price data
  const [prices, setPrices] = useState<number[]>([100, 102, 101, 103, 104])

  // Components
  const [oracle, setOracle] = useState<Oracle | null>(null)
  const [contract, setContract] = useState<Contract | null>(null)
  const [attacker, setAttacker] = useState<Attacker | null>(null)

  // Transmission state
  const [transmission, setTransmission] = useState<any>(null)
  const [interceptedTransmission, setInterceptedTransmission] = useState<any>(null)
  const [result, setResult] = useState<any>(null)
  const [attackResult, setAttackResult] = useState<any>(null)

  // Visualization state
  const [isSimulating, setIsSimulating] = useState<boolean>(false)
  const [showAttack, setShowAttack] = useState<boolean>(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const attackCanvasRef = useRef<HTMLCanvasElement>(null)

  // Initialize components
  useEffect(() => {
    setOracle(new Oracle(5, 1)) // Use 5 data qubits to handle all 5 prices
    setContract(new Contract())
    setAttacker(new Attacker())
  }, [])

  // Run normal transmission
  const runTransmission = () => {
    if (!oracle || !contract) return

    setIsSimulating(true)

    try {
      // Oracle sends transmission
      const newTransmission = oracle.sendTransmission([...prices]) // Create a copy to avoid reference issues
      setTransmission(newTransmission)

      // Contract receives and verifies transmission
      const newResult = contract.receiveTransmission(newTransmission, prices.length)
      setResult(newResult)
    } catch (error) {
      console.error("Error in transmission:", error)
    } finally {
      setIsSimulating(false)
    }
  }

  // Update the resetSimulation function to not clear transmission when showing attack
  const resetSimulation = () => {
    setInterceptedTransmission(null)
    setResult(null)
    setAttackResult(null)
    setShowAttack(false)
    // Only clear transmission when explicitly resetting
    if (!showAttack) {
      setTransmission(null)
    }
  }

  // Update the runAttack function to not clear the transmission
  const runAttack = () => {
    if (!oracle || !contract) return

    // Reset any previous attack results but keep the transmission
    setInterceptedTransmission(null)
    setResult(null)
    setAttackResult(null)

    // Then start the simulation
    setIsSimulating(true)
    setShowAttack(true)

    try {
      // Create a simplified attack result
      setAttackResult({
        verified: false,
        decodedPrices: prices.map((p) => p * (1 + (Math.random() * 0.4 - 0.2))),
      })
    } catch (error) {
      console.error("Error in attack simulation:", error)
    } finally {
      setIsSimulating(false)
    }
  }

  // Quantum state visualization
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const width = canvas.width
    const height = canvas.height
    const gridSize = 8
    const cellSize = width / gridSize

    if (transmission) {
      // Draw a grid of quantum states

      // Draw grayscale background based on probability amplitudes
      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          // Generate probability value based on position
          const probValue = Math.sin((i + j) * 0.5) * 0.5 + 0.5
          const intensity = Math.floor(probValue * 255)
          ctx.fillStyle = `rgb(${intensity}, ${intensity}, ${intensity})`
          ctx.fillRect(i * cellSize, j * cellSize, cellSize, cellSize)
        }
      }

      // Add quantum state dots with color
      const statePositions = []
      // Top-left cluster
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (Math.random() < 0.7) {
            statePositions.push({
              x: i * cellSize + cellSize / 2,
              y: j * cellSize + cellSize / 2,
              color: "rgba(0, 128, 255, 0.8)", // Blue dots
            })
          }
        }
      }

      // Middle cluster
      for (let i = 2; i < 5; i++) {
        for (let j = 2; j < 5; j++) {
          if (Math.random() < 0.5) {
            statePositions.push({
              x: i * cellSize + cellSize / 2,
              y: j * cellSize + cellSize / 2,
              color: "rgba(0, 180, 120, 0.8)", // Green dots
            })
          }
        }
      }

      // Bottom-right cluster
      for (let i = 5; i < 8; i++) {
        for (let j = 5; j < 8; j++) {
          if (Math.random() < 0.7) {
            statePositions.push({
              x: i * cellSize + cellSize / 2,
              y: j * cellSize + cellSize / 2,
              color: "rgba(100, 80, 255, 0.8)", // Purple dots
            })
          }
        }
      }

      // Draw state dots
      statePositions.forEach((state) => {
        ctx.beginPath()
        ctx.arc(state.x, state.y, cellSize / 4, 0, Math.PI * 2)
        ctx.fillStyle = state.color
        ctx.fill()
      })

      // Add grid lines
      ctx.strokeStyle = "rgba(0, 0, 0, 0.1)"
      ctx.lineWidth = 1
      for (let i = 0; i <= gridSize; i++) {
        ctx.beginPath()
        ctx.moveTo(i * cellSize, 0)
        ctx.lineTo(i * cellSize, height)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(0, i * cellSize)
        ctx.lineTo(width, i * cellSize)
        ctx.stroke()
      }

      // Add label
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
      ctx.font = "12px sans-serif"
      ctx.fillText("Quantum State Representation", 10, 20)
    } else {
      // Draw placeholder text
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)"
      ctx.font = "14px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("Run transmission to see quantum state", width / 2, height / 2)
    }
  }, [transmission])

  // Attack visualization
  useEffect(() => {
    if (!attackCanvasRef.current) return

    const canvas = attackCanvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const width = canvas.width
    const height = canvas.height
    const gridSize = 8
    const cellSize = width / gridSize

    if (showAttack) {
      // Draw a grid of quantum states showing collapse

      // Draw grayscale background with more contrast and noise
      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          // Add noise to probability values to show disturbance
          const noise = Math.random() * 0.3
          const probValue = Math.sin((i + j) * 0.5) * 0.5 + 0.5 + noise
          const intensity = Math.floor(probValue * 255)
          // Add a slight red tint to show collapse
          ctx.fillStyle = `rgb(${intensity}, ${Math.floor(intensity * 0.8)}, ${Math.floor(intensity * 0.8)})`
          ctx.fillRect(i * cellSize, j * cellSize, cellSize, cellSize)
        }
      }

      // Add fewer quantum state dots (showing collapse)
      const statePositions = []

      // Scattered collapsed states
      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          if (Math.random() < 0.2) {
            // Much fewer states than original
            statePositions.push({
              x: i * cellSize + cellSize / 2,
              y: j * cellSize + cellSize / 2,
              color: "rgba(220, 50, 50, 0.8)", // Red dots for collapsed states
            })
          }
        }
      }

      // Draw state dots with measurement indicators
      statePositions.forEach((state) => {
        // Draw measurement effect
        ctx.beginPath()
        ctx.arc(state.x, state.y, cellSize / 3, 0, Math.PI * 2)
        ctx.strokeStyle = "rgba(255, 0, 0, 0.3)"
        ctx.lineWidth = 2
        ctx.stroke()

        // Draw state dot
        ctx.beginPath()
        ctx.arc(state.x, state.y, cellSize / 4, 0, Math.PI * 2)
        ctx.fillStyle = state.color
        ctx.fill()
      })

      // Add measurement symbols (X marks)
      ctx.strokeStyle = "rgba(255, 0, 0, 0.5)"
      ctx.lineWidth = 2
      for (let i = 0; i < 12; i++) {
        const x = Math.random() * width
        const y = Math.random() * height
        const size = 8 + Math.random() * 8

        ctx.beginPath()
        ctx.moveTo(x - size, y - size)
        ctx.lineTo(x + size, y + size)
        ctx.moveTo(x + size, y - size)
        ctx.lineTo(x - size, y + size)
        ctx.stroke()
      }

      // Add "COLLAPSED" text overlay
      ctx.font = "bold 24px sans-serif"
      ctx.fillStyle = "rgba(255, 0, 0, 0.2)"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText("QUANTUM STATE COLLAPSED", width / 2, height / 2)

      // Add grid lines
      ctx.strokeStyle = "rgba(0, 0, 0, 0.1)"
      ctx.lineWidth = 1
      for (let i = 0; i <= gridSize; i++) {
        ctx.beginPath()
        ctx.moveTo(i * cellSize, 0)
        ctx.lineTo(i * cellSize, height)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(0, i * cellSize)
        ctx.lineTo(width, i * cellSize)
        ctx.stroke()
      }

      // Add label
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
      ctx.font = "12px sans-serif"
      ctx.fillText("Intercepted Quantum State (Collapsed)", 10, 20)
    } else {
      // Draw placeholder text
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)"
      ctx.font = "14px sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText("Run attack simulation to see intercepted state", width / 2, height / 2)
    }
  }, [showAttack])

  return (
    <div className="flex flex-col space-y-6 w-full max-w-5xl mx-auto p-4 sm:p-6 bg-background text-foreground">
      <div className="flex flex-col items-center space-y-3 mb-2">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">PotonQ</h1>
        <p className="text-muted-foreground text-lg">Quantum Secure Transmission Pipeline</p>
        <Separator className="w-1/3 my-2 bg-border" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2 space-y-1">
            <CardTitle className="text-xl font-semibold flex items-center">
              <ShieldIcon className="h-5 w-5 mr-2 text-primary" />
              Oracle (Sender)
            </CardTitle>
            <CardDescription>Encodes and scrambles price data for secure transmission</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pb-0">
            <div className="bg-muted p-4 rounded-md">
              <label className="text-sm font-medium block mb-2">Price Data:</label>
              <div className="flex flex-wrap gap-2">
                {prices.map((price, index) => (
                  <input
                    key={index}
                    type="number"
                    value={price}
                    onChange={(e) => {
                      const newPrices = [...prices]
                      newPrices[index] = Number.parseInt(e.target.value) || 0
                      setPrices(newPrices)
                    }}
                    className="w-16 p-2 border border-input rounded-md text-center focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    disabled={isSimulating}
                  />
                ))}
              </div>
            </div>

            <div className="relative aspect-square w-full border border-border rounded-md overflow-hidden bg-white">
              <canvas ref={canvasRef} width={300} height={300} className="w-full h-full" />
              {!transmission && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  Run transmission to see quantum state
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between pt-4 pb-4 gap-2">
            <Button onClick={runTransmission} disabled={isSimulating} variant="default" className="w-full">
              <PlayIcon className="mr-2 h-4 w-4" />
              Run Secure Transmission
            </Button>

            <Button
              onClick={resetSimulation}
              disabled={isSimulating || (!transmission && !interceptedTransmission)}
              variant="outline"
              size="icon"
            >
              <RefreshCwIcon className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className={cn("pb-2 space-y-1", showAttack ? "" : "bg-background")}>
            <CardTitle className="text-xl font-semibold flex items-center">
              {showAttack ? (
                <>
                  <AlertTriangleIcon className="h-5 w-5 mr-2 text-destructive" />
                  Attack Simulation
                </>
              ) : (
                <>
                  <ShieldIcon className="h-5 w-5 mr-2 text-primary" />
                  Contract (Receiver)
                </>
              )}
            </CardTitle>
            <CardDescription>
              {showAttack
                ? "Demonstrates how quantum measurement causes state collapse"
                : "Unscrambles and verifies the received quantum data"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pb-0">
            {showAttack ? (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-md">
                  <label className="text-sm font-medium block mb-2">Corrupted Prices:</label>
                  <div className="flex flex-wrap gap-2">
                    {prices.map((price, index) => (
                      <div
                        key={index}
                        className="w-16 p-2 border border-destructive/20 rounded text-center bg-destructive/10 text-destructive"
                      >
                        {(price * (1 + (Math.random() * 0.2 - 0.1))).toFixed(2)}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative aspect-square w-full border border-border rounded-md overflow-hidden bg-white">
                  <canvas ref={attackCanvasRef} width={300} height={300} className="w-full h-full" />
                </div>

                <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center">
                    <XCircleIcon className="h-5 w-5 mr-2 text-destructive" />
                    <span className="font-medium">Tampering Detected: YES</span>
                  </div>
                </div>
              </div>
            ) : result ? (
              <div className="space-y-4">
                <div
                  className={cn(
                    "p-4 rounded-md flex items-center",
                    result.verified
                      ? "bg-green-100 border border-green-200"
                      : "bg-destructive/10 border border-destructive/20",
                  )}
                >
                  {result.verified ? (
                    <>
                      <CheckCircle2Icon className="h-5 w-5 mr-2 text-green-600" />
                      <span className="font-medium">Verification: SUCCESS</span>
                    </>
                  ) : (
                    <>
                      <XCircleIcon className="h-5 w-5 mr-2 text-destructive" />
                      <span className="font-medium">Verification: FAILURE</span>
                    </>
                  )}
                </div>

                <div className="bg-muted p-4 rounded-md">
                  <label className="text-sm font-medium block mb-2">Decoded Prices:</label>
                  <div className="flex flex-wrap gap-2">
                    {result.decodedPrices.map((price: number, index: number) => (
                      <div
                        key={index}
                        className={cn(
                          "w-16 p-2 border rounded text-center",
                          result.verified
                            ? "border-green-200 bg-green-50 text-green-700"
                            : "border-destructive/20 bg-destructive/10 text-destructive",
                        )}
                      >
                        {price.toFixed(2)}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Match Accuracy</span>
                    <span className="text-sm text-muted-foreground">{result.verified ? "100%" : "0%"}</span>
                  </div>
                  <Progress
                    value={result.verified ? 100 : 0}
                    className={cn("h-3", result.verified ? "bg-green-100" : "bg-destructive/10")}
                  >
                    <div
                      className={cn("h-full rounded-full", result.verified ? "bg-green-600" : "bg-destructive")}
                      style={{ width: `${result.verified ? 100 : 0}%` }}
                    />
                  </Progress>
                </div>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Run transmission to see verification results
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-4 pb-4">
            <Button 
              onClick={runAttack} 
              disabled={isSimulating} 
              className="w-full bg-red-500 hover:bg-red-600 text-white"
            >
              <AlertTriangleIcon className="mr-2 h-4 w-4" />
              Simulate Eavesdropping Attack
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}