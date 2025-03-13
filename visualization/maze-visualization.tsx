"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { PlayIcon, PauseIcon, RefreshCwIcon as RefreshIcon } from "lucide-react"
import { generateMaze, type Maze } from "../utils/maze"
import { QuantumMazeSolver } from "../demos/quantum-maze-solver"

export function MazeVisualization() {
  const [maze, setMaze] = useState<Maze | null>(null)
  const [solver, setSolver] = useState<QuantumMazeSolver | null>(null)
  const [isTraining, setIsTraining] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [totalSteps, setTotalSteps] = useState(0)
  const [loss, setLoss] = useState<number[]>([])
  const [learningRate, setLearningRate] = useState(0.1)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)

  // Generate a new maze
  const generateNewMaze = () => {
    if (isTraining) return

    const newMaze = generateMaze(10, 10) // 10x10 maze
    setMaze(newMaze)

    const newSolver = new QuantumMazeSolver(newMaze)
    setSolver(newSolver)

    setIsTraining(false)
    setProgress(0)
    setCurrentStep(0)
    setTotalSteps(0)
    setLoss([])
    setLearningRate(0.1)
  }

  // Start or stop training
  const toggleTraining = async () => {
    if (!solver) return

    if (isTraining) {
      solver.stopTraining()
      setIsTraining(false)
    } else {
      setIsTraining(true)
      solver.startTraining().then(() => {
        setIsTraining(false)
      })
    }
  }

  // Reset the solver
  const resetSolver = () => {
    if (!solver || isTraining) return

    solver.reset()
    setProgress(0)
    setCurrentStep(0)
    setLoss([])
    setLearningRate(0.1)
  }

  // Update the progress state
  useEffect(() => {
    if (!solver) return

    const updateProgress = () => {
      const { isTraining, currentStep, totalSteps, percentComplete, loss, learningRate } = solver.progress

      setIsTraining(isTraining)
      setCurrentStep(currentStep)
      setTotalSteps(totalSteps)
      setProgress(percentComplete)

      // Only update loss if it has changed
      if (loss.length > 0 && (loss.length !== loss.length || loss[loss.length - 1] !== loss[loss.length - 1])) {
        setLoss(loss)
      }

      setLearningRate(learningRate)

      if (isTraining) {
        animationRef.current = requestAnimationFrame(updateProgress)
      }
    }

    animationRef.current = requestAnimationFrame(updateProgress)

    return () => {
      cancelAnimationFrame(animationRef.current)
    }
  }, [solver, isTraining])

  // Draw the maze
  useEffect(() => {
    if (!canvasRef.current || !maze || !solver) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { width, height } = maze
    const cellSize = Math.min(canvas.width / width, canvas.height / height)

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Get updated maze with path information
    const updatedMaze = solver.maze

    // Get quantum state information
    const { significantPositions } = solver.quantumState

    // Create a map of significant positions for faster lookup
    const significantPosMap = new Map<string, number>()
    for (const { x, y, probability } of significantPositions) {
      significantPosMap.set(`${x},${y}`, probability)
    }

    // Draw cells
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = updatedMaze.cells[y][x]
        const cellX = x * cellSize
        const cellY = y * cellSize

        // Get quantum probability for this cell
        const quantumProb = (cell as any).quantumProbability || significantPosMap.get(`${x},${y}`) || 0

        // Fill cell based on type
        if (cell.isStart) {
          ctx.fillStyle = "#000000" // Start cell (black)
        } else if (cell.isEnd) {
          ctx.fillStyle = "#FFFFFF" // End cell (white)
        } else if (cell.isPath) {
          ctx.fillStyle = "#444444" // Path cell (dark gray)
        } else if (quantumProb > 0) {
          // Quantum probability visualization (grayscale based on probability)
          const intensity = Math.min(200, Math.max(100, Math.floor(quantumProb * 1000)))
          ctx.fillStyle = `rgb(${intensity}, ${intensity}, ${intensity})`
        } else if (cell.isExplored) {
          ctx.fillStyle = "#DDDDDD" // Explored cell (light gray)
        } else {
          ctx.fillStyle = "#FFFFFF" // Regular cell (white)
        }

        ctx.fillRect(cellX, cellY, cellSize, cellSize)

        // Draw walls - only if we need to
        if (cell.walls.top || cell.walls.right || cell.walls.bottom || cell.walls.left) {
          ctx.strokeStyle = "#000000"
          ctx.lineWidth = 2

          if (cell.walls.top) {
            ctx.beginPath()
            ctx.moveTo(cellX, cellY)
            ctx.lineTo(cellX + cellSize, cellY)
            ctx.stroke()
          }

          if (cell.walls.right) {
            ctx.beginPath()
            ctx.moveTo(cellX + cellSize, cellY)
            ctx.lineTo(cellX + cellSize, cellY + cellSize)
            ctx.stroke()
          }

          if (cell.walls.bottom) {
            ctx.beginPath()
            ctx.moveTo(cellX, cellY + cellSize)
            ctx.lineTo(cellX + cellSize, cellY + cellSize)
            ctx.stroke()
          }

          if (cell.walls.left) {
            ctx.beginPath()
            ctx.moveTo(cellX, cellY)
            ctx.lineTo(cellX, cellY + cellSize)
            ctx.stroke()
          }
        }
      }
    }

    // Draw end cell marker
    const { end } = maze
    if (updatedMaze.cells[end.y][end.x].isEnd) {
      ctx.strokeStyle = "#000000"
      ctx.lineWidth = 2
      ctx.strokeRect(end.x * cellSize + 2, end.y * cellSize + 2, cellSize - 4, cellSize - 4)
    }

    // Draw quantum superposition effects - limit to top 10 for performance
    const topPositions = significantPositions.slice(0, 10)
    for (const { x, y, probability } of topPositions) {
      if (!updatedMaze.cells[y][x].isPath) {
        const cellX = x * cellSize
        const cellY = y * cellSize

        // Draw probability cloud (semi-transparent circle)
        const radius = cellSize * 0.3 * Math.sqrt(probability)
        ctx.beginPath()
        ctx.arc(cellX + cellSize / 2, cellY + cellSize / 2, radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(100, 100, 100, ${probability * 0.7})`
        ctx.fill()
      }
    }

    // Draw start and end markers
    const { start } = maze

    // Start marker (filled circle)
    ctx.fillStyle = "#FFFFFF"
    ctx.beginPath()
    ctx.arc(start.x * cellSize + cellSize / 2, start.y * cellSize + cellSize / 2, cellSize / 4, 0, Math.PI * 2)
    ctx.fill()

    // End marker (target)
    ctx.strokeStyle = "#000000"
    ctx.lineWidth = 2

    // Outer circle
    ctx.beginPath()
    ctx.arc(end.x * cellSize + cellSize / 2, end.y * cellSize + cellSize / 2, cellSize / 3, 0, Math.PI * 2)
    ctx.stroke()

    // Inner circle
    ctx.beginPath()
    ctx.arc(end.x * cellSize + cellSize / 2, end.y * cellSize + cellSize / 2, cellSize / 6, 0, Math.PI * 2)
    ctx.stroke()
  }, [maze, solver, currentStep])

  // Generate a maze on component mount
  useEffect(() => {
    generateNewMaze()
  }, [])

  return (
    <div className="flex flex-col space-y-6 w-full max-w-4xl mx-auto p-4 bg-background text-foreground">
      <div className="flex flex-col items-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Quantum Neural Network</h1>
        <p className="text-muted-foreground">Maze Solver Visualization</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border border-border bg-card text-card-foreground">
          <CardHeader className="pb-3">
            <CardTitle>Quantum Maze Environment</CardTitle>
            <CardDescription>Visualization of quantum superposition and path finding</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-square w-full border border-border rounded-md overflow-hidden bg-muted">
              <canvas ref={canvasRef} width={500} height={500} className="w-full h-full" />
            </div>
            <div className="flex justify-between mt-4">
              <Button 
                onClick={toggleTraining} 
                disabled={!solver} 
                className="mr-2" 
                variant="default"
              >
                {isTraining ? <PauseIcon className="mr-2 h-4 w-4" /> : <PlayIcon className="mr-2 h-4 w-4" />}
                {isTraining ? "Pause Training" : "Start Training"}
              </Button>
              <Button onClick={generateNewMaze} disabled={isTraining} variant="outline" size="sm">
                Generate New Maze
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card text-card-foreground">
          <CardHeader className="pb-3">
            <CardTitle>Quantum Neural Network Training</CardTitle>
            <CardDescription>
              {isTraining
                ? `Training in progress: ${currentStep}/${totalSteps} steps`
                : currentStep > 0
                  ? `Trained for ${currentStep} steps`
                  : "Start training to solve the maze"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={resetSolver} disabled={isTraining || !solver || currentStep === 0} className="flex-1" variant="outline">
                <RefreshIcon className="h-4 w-4 mr-2" />
                Reset Training
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
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

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Learning Rate</span>
                <span className="text-sm text-muted-foreground">{learningRate.toFixed(4)}</span>
              </div>
              <Progress value={learningRate * 100} />
            </div>

            <Separator />

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Quantum Features</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  <span className="inline-block w-3 h-3 bg-black mr-2"></span>
                  Start position
                </p>
                <p>
                  <span className="inline-block w-3 h-3 bg-white border border-black mr-2"></span>
                  Target position
                </p>
                <p>
                  <span className="inline-block w-3 h-3 bg-[#DDDDDD] mr-2"></span>
                  Explored cells
                </p>
                <p>
                  <span className="inline-block w-3 h-3 bg-[#444444] mr-2"></span>
                  Solution path
                </p>
                <p>
                  <span className="inline-block w-3 h-3 bg-[#999999] mr-2"></span>
                  Quantum superposition (probability cloud)
                </p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground mt-4">
              <p>This quantum-inspired neural network uses:</p>
              <ul className="list-disc pl-4 mt-1 space-y-1">
                <li>Complex number representation for quantum states</li>
                <li>Superposition to explore multiple paths simultaneously</li>
                <li>Entanglement between connected maze cells</li>
                <li>Parameter-shift rule for gradient estimation</li>
                <li>Adaptive learning rate optimization</li>
                <li>Ensemble measurements for robust predictions</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

