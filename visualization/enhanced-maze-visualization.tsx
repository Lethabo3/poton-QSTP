"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { PlayIcon, PauseIcon, RefreshCwIcon as RefreshIcon } from "lucide-react"
import { generateMaze, type Maze } from "../utils/maze"
import { EnhancedMazeSolver } from "../demos/enhanced-maze-solver"

export function EnhancedMazeVisualization() {
  const [maze, setMaze] = useState<Maze | null>(null)
  const [solver, setSolver] = useState<EnhancedMazeSolver | null>(null)
  const [isTraining, setIsTraining] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [totalSteps, setTotalSteps] = useState(0)
  const [loss, setLoss] = useState<number[]>([])
  const [isSolved, setIsSolved] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)

  // Update the maze visualization to show quantum effects more clearly

  // First, add a state to track tunneled positions
  const [tunneledPositions, setTunneledPositions] = useState<{ x: number; y: number }[]>([])
  const [superpositionStates, setSuperpositionStates] = useState<{ x: number; y: number; probability: number }[]>([])

  // Add replay button and state
  const [isReplaying, setIsReplaying] = useState(false)
  const [replaySpeed, setReplaySpeed] = useState(300) // milliseconds between steps

  // Generate a new maze
  const generateNewMaze = () => {
    if (isTraining) return

    const newMaze = generateMaze(10, 10) // 10x10 maze
    setMaze(newMaze)

    const newSolver = new EnhancedMazeSolver(newMaze)
    setSolver(newSolver)

    setIsTraining(false)
    setProgress(0)
    setCurrentStep(0)
    setTotalSteps(0)
    setLoss([])
    setIsSolved(false)
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
    setIsSolved(false)
  }

  // Update the progress state
  useEffect(() => {
    if (!solver) return

    const updateProgress = () => {
      const { isTraining, currentStep, totalSteps, percentComplete, loss, isSolved, isReplaying } = solver.progress

      setIsTraining(isTraining)
      setCurrentStep(currentStep)
      setTotalSteps(totalSteps)
      setProgress(percentComplete)
      setIsReplaying(isReplaying)

      // Properly update loss state
      if (loss && loss.length > 0) {
        setLoss(loss)
      }

      setIsSolved(isSolved)

      // Continue animation frame if training or replaying
      if (isTraining || isReplaying) {
        animationRef.current = requestAnimationFrame(updateProgress)
      }
    }

    // Start the animation frame
    animationRef.current = requestAnimationFrame(updateProgress)

    // Clean up animation frame on unmount
    return () => {
      cancelAnimationFrame(animationRef.current)
    }
  }, [solver])

  // Add a function to start replay
  const startReplay = () => {
    if (!solver || isTraining || isReplaying) return
    solver.startReplay(replaySpeed)
  }

  // Add a function to stop replay
  const stopReplay = () => {
    if (!solver || !isReplaying) return
    solver.stopReplay()
  }

  // Add a function to handle replay speed change
  const handleReplaySpeedChange = (newSpeed: number) => {
    setReplaySpeed(newSpeed)
    if (isReplaying && solver) {
      solver.stopReplay()
      solver.startReplay(newSpeed)
    }
  }

  // Update the useEffect that draws the maze to show quantum effects
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
    setSuperpositionStates(significantPositions)

    // Get tunneled positions if available
    if ("tunneledPositions" in solver) {
      setTunneledPositions((solver as any).tunneledPositions || [])
    }

    // Create a map of significant positions for faster lookup
    const significantPosMap = new Map<string, number>()
    for (const { x, y, probability } of significantPositions) {
      significantPosMap.set(`${x},${y}`, probability)
    }

    // Create a map of tunneled positions for faster lookup
    const tunneledPosMap = new Set<string>()
    for (const { x, y } of tunneledPositions || []) {
      tunneledPosMap.add(`${x},${y}`)
    }

    // Draw cells - using only black and white tones
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = updatedMaze.cells[y][x]
        const cellX = x * cellSize
        const cellY = y * cellSize

        // Get quantum probability for this cell
        const quantumProb = (cell as any).quantumProbability || significantPosMap.get(`${x},${y}`) || 0
        const isTunneled = tunneledPosMap.has(`${x},${y}`)

        // Fill cell based on type - using only black and white tones
        if (cell.isStart) {
          ctx.fillStyle = "#000000" // Start cell (black)
        } else if (cell.isEnd) {
          ctx.fillStyle = "#FFFFFF" // End cell (white)
          ctx.strokeStyle = "#000000"
          ctx.lineWidth = 2
          ctx.strokeRect(cellX + 2, cellY + 2, cellSize - 4, cellSize - 4)
        } else if (cell.isPath) {
          ctx.fillStyle = "#333333" // Path cell (dark gray)
        } else if (isTunneled) {
          // Tunneled cells get a special pattern
          ctx.fillStyle = "#FFFFFF"
          ctx.fillRect(cellX, cellY, cellSize, cellSize)

          // Add a tunneling pattern
          ctx.fillStyle = "#000000"
          ctx.beginPath()
          for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
              if ((i + j) % 2 === 0) {
                ctx.rect(cellX + (i * cellSize) / 3, cellY + (j * cellSize) / 3, cellSize / 3, cellSize / 3)
              }
            }
          }
          ctx.fill()
        } else if (quantumProb > 0) {
          // Quantum probability visualization (grayscale)
          const intensity = Math.min(200, Math.max(100, Math.floor(quantumProb * 255)))
          ctx.fillStyle = `rgb(${intensity}, ${intensity}, ${intensity})`
        } else if (cell.isExplored) {
          ctx.fillStyle = "#DDDDDD" // Explored cell (light gray)
        } else {
          ctx.fillStyle = "#FFFFFF" // Regular cell (white)
        }

        ctx.fillRect(cellX, cellY, cellSize, cellSize)

        // Draw walls
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

    // Draw quantum superposition effects - make them more visible
    for (const { x, y, probability } of significantPositions) {
      if (probability > 0.05) {
        // Only show significant probabilities
        const cellX = x * cellSize
        const cellY = y * cellSize

        // Draw probability cloud
        ctx.fillStyle = `rgba(0, 0, 0, ${probability * 0.3})`
        ctx.beginPath()
        ctx.arc(cellX + cellSize / 2, cellY + cellSize / 2, cellSize * 0.4 * Math.sqrt(probability), 0, Math.PI * 2)
        ctx.fill()

        // Add wave-like pattern to represent quantum nature
        ctx.strokeStyle = `rgba(0, 0, 0, ${probability * 0.5})`
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let i = 0; i < 3; i++) {
          const radius = cellSize * (0.2 + i * 0.1) * Math.sqrt(probability)
          ctx.arc(cellX + cellSize / 2, cellY + cellSize / 2, radius, 0, Math.PI * 2)
        }
        ctx.stroke()
      }
    }

    // Draw start and end markers
    const { start, end } = maze

    // Start marker (filled circle)
    ctx.fillStyle = "#000000"
    ctx.beginPath()
    ctx.arc(start.x * cellSize + cellSize / 2, start.y * cellSize + cellSize / 2, cellSize / 3, 0, Math.PI * 2)
    ctx.fill()

    // End marker (target)
    ctx.fillStyle = "#FFFFFF"
    ctx.strokeStyle = "#000000"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(end.x * cellSize + cellSize / 2, end.y * cellSize + cellSize / 2, cellSize / 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // Draw current position
    const currentPath = solver.currentPath
    if (currentPath.length > 0) {
      const current = currentPath[currentPath.length - 1]
      ctx.fillStyle = "#666666" // Medium gray for current position
      ctx.beginPath()
      ctx.arc(current.x * cellSize + cellSize / 2, current.y * cellSize + cellSize / 2, cellSize / 4, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [maze, solver, currentStep, tunneledPositions, superpositionStates, isReplaying])

  // Generate a maze on component mount
  useEffect(() => {
    generateNewMaze()
  }, [])

  return (
    <div className="flex flex-col space-y-6 w-full max-w-4xl mx-auto p-4 bg-white text-black">
      <div className="flex flex-col items-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Quantum Neural Network</h1>
        <p className="text-gray-600">Maze Solver with Advanced Quantum Features</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border border-gray-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle>Quantum Maze Environment</CardTitle>
            <CardDescription className="text-gray-500">
              Visualization of quantum superposition and path finding
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-square w-full border border-gray-200 rounded-md overflow-hidden bg-white">
              <canvas ref={canvasRef} width={500} height={500} className="w-full h-full" />
            </div>
            <div className="flex justify-between mt-4">
              <div className="flex gap-2">
                <Button
                  onClick={toggleTraining}
                  disabled={!solver || isReplaying}
                  className="bg-black text-white hover:bg-gray-800"
                >
                  {isTraining ? <PauseIcon className="mr-2 h-4 w-4" /> : <PlayIcon className="mr-2 h-4 w-4" />}
                  {isTraining ? "Pause Training" : "Start Training"}
                </Button>

                {isSolved && (
                  <Button
                    onClick={isReplaying ? stopReplay : startReplay}
                    disabled={!solver || isTraining}
                    className="bg-gray-700 text-white hover:bg-gray-600"
                  >
                    {isReplaying ? <PauseIcon className="mr-2 h-4 w-4" /> : <PlayIcon className="mr-2 h-4 w-4" />}
                    {isReplaying ? "Pause Replay" : "Replay Path"}
                  </Button>
                )}
              </div>

              <Button
                onClick={generateNewMaze}
                disabled={isTraining || isReplaying}
                variant="outline"
                size="sm"
                className="border-black text-black hover:bg-gray-100"
              >
                Generate New Maze
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle>Quantum Neural Network Training</CardTitle>
            <CardDescription className="text-gray-500">
              {isTraining
                ? `Training in progress: ${currentStep}/${totalSteps} steps`
                : currentStep > 0
                  ? `Trained for ${currentStep} steps`
                  : "Start training to solve the maze"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={resetSolver}
                disabled={isTraining || !solver || currentStep === 0}
                className="flex-1 border-black text-black hover:bg-gray-100"
                variant="outline"
              >
                <RefreshIcon className="h-4 w-4 mr-2" />
                Reset Training
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2 bg-gray-200">
                <div className="h-full bg-black rounded-full" style={{ width: `${progress}%` }} />
              </Progress>
            </div>

            {loss.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Loss</span>
                  <span className="text-sm text-gray-500">
                    {isFinite(loss[loss.length - 1]) ? loss[loss.length - 1].toFixed(4) : "Calculating..."}
                  </span>
                </div>
                <Progress
                  value={isFinite(loss[loss.length - 1]) ? 100 - Math.min(100, loss[loss.length - 1] * 100) : 50}
                  className="h-2 bg-gray-200"
                >
                  <div
                    className="h-full bg-black rounded-full"
                    style={{
                      width: `${isFinite(loss[loss.length - 1]) ? 100 - Math.min(100, loss[loss.length - 1] * 100) : 50}%`,
                    }}
                  />
                </Progress>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Maze Solved</span>
                <span className="text-sm text-gray-500">{isSolved ? "Yes" : "No"}</span>
              </div>
              <Progress value={isSolved ? 100 : 0} className="h-2 bg-gray-200">
                <div className="h-full bg-black rounded-full" style={{ width: `${isSolved ? 100 : 0}%` }} />
              </Progress>
            </div>

            {isSolved && (
              <div className="space-y-2 mt-4">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Replay Speed</span>
                  <span className="text-sm text-gray-500">{replaySpeed}ms</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="50"
                  value={replaySpeed}
                  onChange={(e) => handleReplaySpeedChange(Number(e.target.value))}
                  disabled={isTraining}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Fast</span>
                  <span>Slow</span>
                </div>
              </div>
            )}

            <Separator className="bg-gray-200" />

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Quantum Features</h3>
              <div className="space-y-1 text-sm text-gray-500">
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
                  <span className="inline-block w-3 h-3 bg-[#333333] mr-2"></span>
                  Solution path
                </p>
                <p>
                  <span className="inline-block w-3 h-3 bg-[#999999] mr-2"></span>
                  Quantum superposition (probability cloud)
                </p>
                <p>
                  <span className="inline-block w-3 h-3 bg-[#666666] mr-2"></span>
                  Current position
                </p>
                <p>
                  <span
                    className="inline-block w-3 h-3 bg-white mr-2"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(45deg, #000, #000 2px, transparent 2px, transparent 4px)",
                    }}
                  ></span>
                  Quantum tunneling (through walls)
                </p>
              </div>
            </div>

            <div className="text-xs text-gray-500 mt-4">
              <p>This quantum neural network implements:</p>
              <ul className="list-disc pl-4 mt-1 space-y-1">
                <li>Quantum attention mechanism for focused learning</li>
                <li>Quantum batch normalization for stable training</li>
                <li>Quantum dropout for improved generalization</li>
                <li>Noise-resilient training techniques</li>
                <li>Quantum entanglement between neurons</li>
                <li>Heisenberg uncertainty-inspired regularization</li>
                <li>Quantum superposition ensemble methods</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-gray-200 bg-white">
        <CardHeader className="pb-3">
          <CardTitle>Quantum Neural Network Architecture</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-md p-4">
              <h3 className="font-medium mb-2">Quantum Entanglement</h3>
              <p className="text-sm text-gray-500 mb-3">
                Non-local connections between neurons allow information to "teleport" across the network, creating
                long-range dependencies that traditional networks cannot achieve.
              </p>
              <div className="h-24 bg-gray-50 rounded-md flex items-center justify-center">
                <svg width="100" height="80" viewBox="0 0 100 80">
                  <line x1="20" y1="20" x2="80" y2="60" stroke="black" strokeWidth="1" strokeDasharray="2,2" />
                  <line x1="20" y1="60" x2="80" y2="20" stroke="black" strokeWidth="1" strokeDasharray="2,2" />
                  <circle cx="20" cy="20" r="8" fill="black" />
                  <circle cx="80" cy="20" r="8" fill="white" stroke="black" strokeWidth="1" />
                  <circle cx="20" cy="60" r="8" fill="white" stroke="black" strokeWidth="1" />
                  <circle cx="80" cy="60" r="8" fill="black" />
                </svg>
              </div>
            </div>

            <div className="border border-gray-200 rounded-md p-4">
              <h3 className="font-medium mb-2">Quantum Uncertainty</h3>
              <p className="text-sm text-gray-500 mb-3">
                Inspired by Heisenberg's principle, this creates a fundamental trade-off between precision in different
                network dimensions, improving generalization.
              </p>
              <div className="h-24 bg-gray-50 rounded-md flex items-center justify-center">
                <svg width="100" height="80" viewBox="0 0 100 80">
                  <path d="M 10,40 C 30,10 70,70 90,40" stroke="black" fill="none" strokeWidth="2" />
                  <line x1="10" y1="40" x2="90" y2="40" stroke="black" strokeWidth="1" strokeDasharray="2,2" />
                  <rect x="40" y="10" width="20" height="5" fill="black" />
                  <rect x="10" y="35" width="5" height="10" fill="black" />
                </svg>
              </div>
            </div>

            <div className="border border-gray-200 rounded-md p-4">
              <h3 className="font-medium mb-2">Quantum Superposition</h3>
              <p className="text-sm text-gray-500 mb-3">
                Maintains multiple "quantum states" of the network simultaneously, collapsing them based on measurement
                results.
              </p>
              <div className="h-24 bg-gray-50 rounded-md flex items-center justify-center">
                <svg width="100" height="80" viewBox="0 0 100 80">
                  <circle cx="50" cy="40" r="25" fill="none" stroke="black" strokeWidth="1" />
                  <circle cx="40" cy="30" r="8" fill="black" />
                  <circle cx="60" cy="30" r="6" fill="white" stroke="black" strokeWidth="1" />
                  <circle cx="35" cy="50" r="7" fill="white" stroke="black" strokeWidth="1" />
                  <circle cx="65" cy="50" r="5" fill="black" />
                </svg>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="border border-gray-200 bg-white mt-4">
        <CardHeader className="pb-3">
          <CardTitle>Quantum Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium mb-1">Superposition States</div>
              <div className="text-2xl font-bold">{superpositionStates.length}</div>
              <div className="text-xs text-gray-500 mt-1">Active quantum states</div>
            </div>
            <div>
              <div className="text-sm font-medium mb-1">Tunneling Events</div>
              <div className="text-2xl font-bold">{tunneledPositions.length}</div>
              <div className="text-xs text-gray-500 mt-1">Wall barriers crossed</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

