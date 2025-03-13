"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { PerformanceMonitor } from "../utils/performance-monitor"

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<{ operation: string; count: number; avgTime: number; maxTime: number }[]>([])
  const [cacheStats, setCacheStats] = useState<{ size: number; hits: number; misses: number; hitRate: number }>({
    size: 0,
    hits: 0,
    misses: 0,
    hitRate: 0,
  })
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null)

  // Toggle performance monitoring
  const toggleMonitoring = () => {
    const monitor = PerformanceMonitor.getInstance()
    const newState = !isMonitoring
    setIsMonitoring(newState)
    monitor.setEnabled(newState)

    if (newState) {
      // Start refreshing metrics
      const interval = window.setInterval(() => {
        setMetrics(monitor.getMetrics())
      }, 1000)
      setRefreshInterval(interval)
    } else {
      // Stop refreshing metrics
      if (refreshInterval !== null) {
        window.clearInterval(refreshInterval)
        setRefreshInterval(null)
      }
    }
  }

  // Reset metrics
  const resetMetrics = () => {
    const monitor = PerformanceMonitor.getInstance()
    monitor.reset()
    setMetrics([])
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (refreshInterval !== null) {
        window.clearInterval(refreshInterval)
      }
    }
  }, [refreshInterval])

  return (
    <Card className="border border-gray-200 bg-white">
      <CardHeader className="pb-3">
        <CardTitle>Quantum Neural Network Performance</CardTitle>
        <CardDescription className="text-gray-500">
          Monitor performance metrics and optimization statistics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between mb-4">
          <Button
            onClick={toggleMonitoring}
            className={isMonitoring ? "bg-gray-800 text-white" : "bg-black text-white"}
          >
            {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
          </Button>
          <Button onClick={resetMetrics} variant="outline" className="border-black text-black" disabled={!isMonitoring}>
            Reset Metrics
          </Button>
        </div>

        <Separator className="my-4" />

        <div className="space-y-4">
          <h3 className="text-sm font-medium">Operation Performance</h3>

          {metrics.length === 0 ? (
            <p className="text-sm text-gray-500">No metrics collected yet. Start monitoring to collect data.</p>
          ) : (
            <div className="space-y-3">
              {metrics.map((metric, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">{metric.operation}</span>
                    <span className="text-sm text-gray-500">{metric.avgTime.toFixed(2)}ms avg</span>
                  </div>
                  <Progress value={Math.min(100, metric.avgTime)} max={100} className="h-2 bg-gray-200">
                    <div
                      className="h-full bg-black rounded-full"
                      style={{ width: `${Math.min(100, metric.avgTime)}%` }}
                    />
                  </Progress>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Count: {metric.count}</span>
                    <span>Max: {metric.maxTime.toFixed(2)}ms</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator className="my-4" />

        <div className="space-y-4">
          <h3 className="text-sm font-medium">Cache Statistics</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium mb-1">Cache Size</div>
              <div className="text-2xl font-bold">{cacheStats.size}</div>
              <div className="text-xs text-gray-500 mt-1">Cached computations</div>
            </div>
            <div>
              <div className="text-sm font-medium mb-1">Hit Rate</div>
              <div className="text-2xl font-bold">{(cacheStats.hitRate * 100).toFixed(1)}%</div>
              <div className="text-xs text-gray-500 mt-1">Cache efficiency</div>
            </div>
          </div>

          <div className="space-y-1 mt-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Cache Hits vs Misses</span>
            </div>
            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
              <div className="h-full bg-black rounded-full" style={{ width: `${cacheStats.hitRate * 100}%` }} />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Hits: {cacheStats.hits}</span>
              <span>Misses: {cacheStats.misses}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

