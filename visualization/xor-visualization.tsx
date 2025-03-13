"use client"

import { useEffect, useState, useRef } from "react"
import { XORDemoSimplified } from "../demos/xor-demo-simplified"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { InfoIcon, PlayIcon, PauseIcon, RefreshCwIcon as RefreshIcon } from "lucide-react"

export function XORVisualization() {
  const [isTraining, setIsTraining] = useState(false)
  const [epoch, setEpoch] = useState(0)
  const [loss, setLoss] = useState<number[]>([])
  const [predictions, setPredictions] = useState<{ input: number[]; target: number; prediction: number }[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const demoRef = useRef<XORDemoSimplified>()

  useEffect(() => {
    // Initialize the XOR demo
    demoRef.current = new XORDemoSimplified()
    runTest()
  }, [])

  useEffect(() => {
    if (canvasRef.current) {
      drawDecisionBoundary()
    }
  }, [predictions])

  const runTest = () => {
    if (!demoRef.current) return

    const { inputs, targets, predictions } = demoRef.current.test()
    setPredictions(
      inputs.map((input, i) => ({
        input,
        target: targets[i][0],
        prediction: predictions[i][0],
      })),
    )
  }

  const startTraining = async () => {
    if (!demoRef.current || isTraining) return

    setIsTraining(true)
    setLoss([])

    // Train in small batches to update UI
    const totalEpochs = 100
    const batchSize = 5

    for (let i = 0; i < totalEpochs; i += batchSize) {
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          if (!demoRef.current) return resolve()

          // Create a new network for this batch
          const batchLosses = demoRef.current.train(batchSize, 0.05)

          setEpoch(i + batchSize)
          setLoss((prev) => [...prev, ...batchLosses])
          runTest()
          resolve()
        }, 0)
      })
    }

    setIsTraining(false)
  }

  const resetTraining = () => {
    if (isTraining) return

    demoRef.current = new XORDemoSimplified()
    setEpoch(0)
    setLoss([])
    runTest()
  }

  const drawDecisionBoundary = () => {
    if (!canvasRef.current || !demoRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw decision boundary with black and white tones
    const resolution = 40
    const { x, y, z } = demoRef.current.visualizeDecisionBoundary(resolution)

    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const value = z[i][j]
        const intensity = Math.min(255, Math.max(0, Math.floor(value * 255)))

        // Using grayscale for the decision boundary
        ctx.fillStyle = `rgb(${intensity}, ${intensity}, ${intensity})`

        const pixelX = x[i] * width
        const pixelY = y[j] * height
        const pixelSize = width / resolution

        ctx.fillRect(pixelX, pixelY, pixelSize, pixelSize)
      }
    }

    // Draw XOR points in black and white
    const points = [
      { x: 0, y: 0, target: 0 },
      { x: 0, y: 1, target: 1 },
      { x: 1, y: 0, target: 1 },
      { x: 1, y: 1, target: 0 },
    ]

    points.forEach((point) => {
      ctx.beginPath()
      ctx.arc(point.x * width, point.y * height, 8, 0, Math.PI * 2)
      // Using black for class 0 and white with black border for class 1
      if (point.target === 0) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)"
        ctx.strokeStyle = "white"
      } else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
        ctx.strokeStyle = "black"
      }
      ctx.fill()
      ctx.lineWidth = 2
      ctx.stroke()
    })
  }

  return (
    <div className="flex flex-col space-y-6 w-full max-w-4xl mx-auto p-4 bg-background text-foreground">
      <div className="flex flex-col items-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Quantum Neural Network</h1>
        <p className="text-muted-foreground">XOR Problem Visualization</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border border-border bg-card text-card-foreground">
          <CardHeader className="pb-3">
            <CardTitle>Decision Boundary</CardTitle>
            <CardDescription>Visualization of the network's classification</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-square w-full border border-border rounded-md overflow-hidden bg-muted">
              <canvas ref={canvasRef} width={300} height={300} className="w-full h-full" />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-black"></div>
              <span>Class 0</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-white border border-black"></div>
              <span>Class 1</span>
            </div>
          </CardFooter>
        </Card>

        <Card className="border border-border bg-card text-card-foreground">
          <CardHeader className="pb-3">
            <CardTitle>Training</CardTitle>
            <CardDescription>
              {isTraining
                ? `Training in progress: ${epoch}/100 epochs`
                : epoch > 0
                  ? `Trained for ${epoch} epochs`
                  : "Start training to see results"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={startTraining} disabled={isTraining} className="flex-1" variant="default">
                {isTraining ? <PauseIcon className="mr-2 h-4 w-4" /> : <PlayIcon className="mr-2 h-4 w-4" />}
                {isTraining ? "Training..." : "Start Training"}
              </Button>
              <Button onClick={resetTraining} disabled={isTraining} variant="outline">
                <RefreshIcon className="h-4 w-4" />
              </Button>
            </div>

            {loss.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Loss</span>
                  <span className="text-sm text-muted-foreground">{loss[loss.length - 1].toFixed(4)}</span>
                </div>
                <Progress value={100 - loss[loss.length - 1] * 100} />
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Predictions</h3>
              <div className="space-y-2">
                {predictions.map((pred, i) => (
                  <div key={i} className="flex justify-between items-center py-1 border-b border-border">
                    <span className="text-sm">Input: [{pred.input.join(", ")}]</span>
                    <Badge variant={pred.prediction > 0.5 === pred.target > 0.5 ? "outline" : "destructive"}>
                      {pred.prediction.toFixed(2)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border bg-card text-card-foreground">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <InfoIcon className="h-5 w-5" />
            <CardTitle>About Quantum Neural Networks</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This demonstration shows a Quantum Neural Network learning the XOR function, which is not linearly
            separable. The visualization shows the decision boundary learned by the network, with black points
            representing XOR=0 and white points representing XOR=1. The quantum approach uses superposition and
            entanglement to learn complex patterns that would require more layers in classical neural networks.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

