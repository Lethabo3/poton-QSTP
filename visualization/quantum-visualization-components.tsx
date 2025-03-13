"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface QuantumVisualizationProps {
  entanglementStrength?: number
  uncertaintyLevel?: number
  ensembleSize?: number
  coherenceFactor?: number
}

/**
 * Visualizes quantum entanglement between neurons
 */
export function QuantumEntanglementVisualizer({ entanglementStrength = 0.5 }: QuantumVisualizationProps) {
  const [nodes, setNodes] = useState<{ x: number; y: number; value: number }[]>([])
  const [links, setLinks] = useState<{ source: number; target: number; strength: number }[]>([])

  // Generate random network on mount
  useEffect(() => {
    // Create nodes
    const newNodes = Array(8)
      .fill(0)
      .map((_, i) => ({
        x: 100 + Math.random() * 300,
        y: 100 + Math.random() * 100,
        value: Math.random(),
      }))

    // Create links with varying strength
    const newLinks = []
    for (let i = 0; i < newNodes.length; i++) {
      for (let j = i + 1; j < newNodes.length; j++) {
        if (Math.random() < entanglementStrength) {
          newLinks.push({
            source: i,
            target: j,
            strength: Math.random() * entanglementStrength,
          })
        }
      }
    }

    setNodes(newNodes)
    setLinks(newLinks)

    // Animate nodes
    const interval = setInterval(() => {
      setNodes((prev) =>
        prev.map((node) => ({
          ...node,
          value: Math.max(0, Math.min(1, node.value + (Math.random() - 0.5) * 0.1)),
        })),
      )
    }, 500)

    return () => clearInterval(interval)
  }, [entanglementStrength])

  return (
    <Card className="border border-gray-200 bg-white">
      <CardHeader className="pb-3">
        <CardTitle>Quantum Entanglement</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full h-[200px] border rounded-md bg-white">
          <svg width="100%" height="100%" viewBox="0 0 400 200">
            {/* Draw links */}
            {links.map((link, i) => (
              <line
                key={`link-${i}`}
                x1={nodes[link.source]?.x || 0}
                y1={nodes[link.source]?.y || 0}
                x2={nodes[link.target]?.x || 0}
                y2={nodes[link.target]?.y || 0}
                stroke={`rgba(0, 0, 0, ${link.strength})`}
                strokeWidth={link.strength * 3}
                strokeDasharray="4,2"
              />
            ))}

            {/* Draw nodes */}
            {nodes.map((node, i) => (
              <circle
                key={`node-${i}`}
                cx={node.x}
                cy={node.y}
                r={10 + node.value * 5}
                fill={node.value > 0.5 ? "white" : "black"}
                stroke="black"
                strokeWidth={node.value > 0.5 ? 1 : 0}
              />
            ))}
          </svg>
        </div>
        <div className="mt-2">
          <div className="flex justify-between text-sm">
            <span>Entanglement Strength</span>
            <span>{(entanglementStrength * 100).toFixed(0)}%</span>
          </div>
          <Progress value={entanglementStrength * 100} className="h-2 bg-gray-200 mt-1">
            <div className="h-full bg-black rounded-full" style={{ width: `${entanglementStrength * 100}%` }} />
          </Progress>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Visualizes quantum uncertainty principle
 */
export function QuantumUncertaintyVisualizer({ uncertaintyLevel = 0.3 }: QuantumVisualizationProps) {
  const [positionPrecision, setPositionPrecision] = useState(1)
  const [momentumPrecision, setMomentumPrecision] = useState(1)
  const [waveFunction, setWaveFunction] = useState<number[]>([])

  // Generate and update wave function
  useEffect(() => {
    // Initialize wave function
    const points = 100
    const initialWave = Array(points)
      .fill(0)
      .map((_, i) => Math.exp(-Math.pow((i - points / 2) / (points / 10), 2) / 2))

    setWaveFunction(initialWave)

    // Update precisions based on uncertainty principle
    const updatePrecisions = () => {
      // Random change to position precision
      const newPositionPrecision = Math.max(0.1, Math.min(2, positionPrecision + (Math.random() - 0.5) * 0.1))

      // Momentum precision follows uncertainty principle: p_x * p_p >= ħ/2
      const hbar = uncertaintyLevel
      const newMomentumPrecision = Math.max(0.1, hbar / (2 * newPositionPrecision))

      setPositionPrecision(newPositionPrecision)
      setMomentumPrecision(newMomentumPrecision)

      // Update wave function based on new precisions
      const newWave = initialWave.map((val, i) => {
        const x = (i - points / 2) / (points / 10)
        // Narrower in position = higher position precision
        const positionFactor = Math.exp(-Math.pow(x / newPositionPrecision, 2) / 2)
        // Add oscillations based on momentum precision
        const momentumFactor = Math.cos(x * newMomentumPrecision * 5)
        return val * positionFactor * (1 + 0.2 * momentumFactor)
      })

      setWaveFunction(newWave)
    }

    const interval = setInterval(updatePrecisions, 1000)
    return () => clearInterval(interval)
  }, [uncertaintyLevel, positionPrecision, momentumPrecision])

  return (
    <Card className="border border-gray-200 bg-white">
      <CardHeader className="pb-3">
        <CardTitle>Quantum Uncertainty</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full h-[200px] border rounded-md bg-gray-50">
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Draw wave function */}
            <path
              d={`M 0,50 ${waveFunction
                .map((y, i) => `L ${(i / waveFunction.length) * 100},${50 - y * 40}`)
                .join(" ")}`}
              stroke="black"
              strokeWidth="1"
              fill="none"
            />

            {/* Draw position uncertainty */}
            <rect x={50 - positionPrecision * 10} y={10} width={positionPrecision * 20} height={5} fill="black" />

            {/* Draw momentum uncertainty */}
            <rect x={10} y={80} width={5} height={momentumPrecision * 10} fill="black" />
          </svg>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <div className="flex justify-between text-sm">
              <span>Position Precision</span>
              <span>{positionPrecision.toFixed(2)}</span>
            </div>
            <Progress value={positionPrecision * 50} className="h-2 bg-gray-200 mt-1">
              <div className="h-full bg-black rounded-full" style={{ width: `${positionPrecision * 50}%` }} />
            </Progress>
          </div>
          <div>
            <div className="flex justify-between text-sm">
              <span>Momentum Precision</span>
              <span>{momentumPrecision.toFixed(2)}</span>
            </div>
            <Progress value={momentumPrecision * 50} className="h-2 bg-gray-200 mt-1">
              <div className="h-full bg-black rounded-full" style={{ width: `${momentumPrecision * 50}%` }} />
            </Progress>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Visualizes quantum superposition ensemble
 */
export function QuantumSuperpositionVisualizer({ ensembleSize = 5, coherenceFactor = 0.3 }: QuantumVisualizationProps) {
  const [models, setModels] = useState<
    {
      id: number
      weights: number[]
      performance: number
      color: string
    }[]
  >([])

  // Generate and update models
  useEffect(() => {
    // Create initial models
    const newModels = Array(ensembleSize)
      .fill(0)
      .map((_, i) => ({
        id: i,
        weights: Array(5)
          .fill(0)
          .map(() => Math.random() * 2 - 1),
        performance: Math.random(),
        color: i % 2 === 0 ? "black" : "white", // Only black and white for monochrome design
      }))

    setModels(newModels)

    // Update models periodically
    const interval = setInterval(() => {
      setModels((prev) => {
        // Calculate coherent state (weighted average)
        const totalPerformance = prev.reduce((sum, m) => sum + m.performance, 0)
        const weights = prev.map((m) => m.performance / totalPerformance)

        const coherentWeights = Array(5).fill(0)
        for (let i = 0; i < prev.length; i++) {
          for (let j = 0; j < 5; j++) {
            coherentWeights[j] += prev[i].weights[j] * weights[i]
          }
        }

        // Update each model
        return prev.map((model) => {
          // Random performance change
          const newPerformance = Math.max(0.1, Math.min(1, model.performance + (Math.random() - 0.4) * 0.1))

          // Mix with coherent state
          const newWeights = model.weights.map(
            (w, j) => w * (1 - coherenceFactor) + coherentWeights[j] * coherenceFactor,
          )

          return {
            ...model,
            weights: newWeights,
            performance: newPerformance,
          }
        })
      })

      // Occasionally collapse or expand ensemble
      if (Math.random() < 0.1) {
        setModels((prev) => {
          // Sort by performance
          const sorted = [...prev].sort((a, b) => b.performance - a.performance)

          if (sorted.length > 3 && Math.random() < 0.5) {
            // Collapse: keep top performers
            return sorted.slice(0, Math.max(2, Math.floor(sorted.length * 0.7)))
          } else if (sorted.length < 8) {
            // Expand: add new models based on best performer
            const best = sorted[0]
            const newModels = [...sorted]

            // Add 1-2 new models
            const numToAdd = 1 + Math.floor(Math.random() * 2)
            for (let i = 0; i < numToAdd; i++) {
              const newId = Math.max(...newModels.map((m) => m.id)) + 1
              newModels.push({
                id: newId,
                weights: best.weights.map((w) => w + (Math.random() - 0.5) * 0.2),
                performance: best.performance * 0.8,
                color: newId % 2 === 0 ? "black" : "white", // Alternate black and white
              })
            }

            return newModels
          }

          return prev
        })
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [ensembleSize, coherenceFactor])

  return (
    <Card className="border border-gray-200 bg-white">
      <CardHeader className="pb-3">
        <CardTitle>Quantum Superposition Ensemble</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full h-[200px] border rounded-md bg-gray-50">
          <svg width="100%" height="100%" viewBox="0 0 100 100">
            {/* Draw connections between models */}
            {models.map((model1, i) =>
              models
                .slice(i + 1)
                .map((model2, j) => (
                  <line
                    key={`link-${model1.id}-${model2.id}`}
                    x1={20 + model1.weights[0] * 30 + model1.weights[1] * 20}
                    y1={50 + model1.weights[2] * 30}
                    x2={20 + model2.weights[0] * 30 + model2.weights[1] * 20}
                    y2={50 + model2.weights[2] * 30}
                    stroke={`rgba(0, 0, 0, ${coherenceFactor})`}
                    strokeWidth={1}
                    strokeDasharray="2,2"
                  />
                )),
            )}

            {/* Draw models */}
            {models.map((model) => (
              <circle
                key={`model-${model.id}`}
                cx={20 + model.weights[0] * 30 + model.weights[1] * 20}
                cy={50 + model.weights[2] * 30}
                r={5 + model.performance * 10}
                fill={model.color}
                stroke="black"
                strokeWidth={model.color === "white" ? 1 : 0}
              />
            ))}
          </svg>
        </div>
        <div className="mt-2">
          <div className="flex justify-between text-sm">
            <span>Ensemble Size</span>
            <span>{models.length}</span>
          </div>
          <Progress value={models.length * 10} className="h-2 bg-gray-200 mt-1">
            <div className="h-full bg-black rounded-full" style={{ width: `${models.length * 10}%` }} />
          </Progress>

          <div className="flex justify-between text-sm mt-2">
            <span>Coherence Factor</span>
            <span>{(coherenceFactor * 100).toFixed(0)}%</span>
          </div>
          <Progress value={coherenceFactor * 100} className="h-2 bg-gray-200 mt-1">
            <div className="h-full bg-black rounded-full" style={{ width: `${coherenceFactor * 100}%` }} />
          </Progress>
        </div>
      </CardContent>
    </Card>
  )
}

