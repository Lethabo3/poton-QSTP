/**
 * Performance monitoring utilities for quantum neural network operations
 */
export class PerformanceMonitor {
  private static _instance: PerformanceMonitor
  private _metrics: Map<string, { count: number; totalTime: number; maxTime: number }>
  private _enabled = false

  private constructor() {
    this._metrics = new Map()
  }

  /**
   * Gets the singleton instance of the performance monitor
   */
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor._instance) {
      PerformanceMonitor._instance = new PerformanceMonitor()
    }
    return PerformanceMonitor._instance
  }

  /**
   * Enables or disables performance monitoring
   */
  setEnabled(enabled: boolean): void {
    this._enabled = enabled
  }

  /**
   * Measures the execution time of a function
   * @param name Name of the operation being measured
   * @param fn Function to measure
   * @returns Result of the function
   */
  measure<T>(name: string, fn: () => T): T {
    if (!this._enabled) return fn()

    const start = performance.now()
    const result = fn()
    const end = performance.now()
    const duration = end - start

    if (!this._metrics.has(name)) {
      this._metrics.set(name, { count: 0, totalTime: 0, maxTime: 0 })
    }

    const metric = this._metrics.get(name)!
    metric.count++
    metric.totalTime += duration
    metric.maxTime = Math.max(metric.maxTime, duration)

    return result
  }

  /**
   * Gets all collected metrics
   */
  getMetrics(): { operation: string; count: number; avgTime: number; maxTime: number }[] {
    return Array.from(this._metrics.entries()).map(([operation, { count, totalTime, maxTime }]) => ({
      operation,
      count,
      avgTime: count > 0 ? totalTime / count : 0,
      maxTime,
    }))
  }

  /**
   * Resets all metrics
   */
  reset(): void {
    this._metrics.clear()
  }
}

/**
 * Helper function to measure performance of a method
 * @param name Name of the operation
 * @param fn Function to measure
 * @returns Result of the function
 */
export function measurePerformance<T>(name: string, fn: () => T): T {
  const monitor = PerformanceMonitor.getInstance()
  return monitor.measure(name, fn)
}

