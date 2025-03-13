export type Cell = {
  x: number
  y: number
  walls: {
    top: boolean
    right: boolean
    bottom: boolean
    left: boolean
  }
  visited: boolean
  isStart: boolean
  isEnd: boolean
  isPath: boolean
  isExplored: boolean
}

export type Maze = {
  width: number
  height: number
  cells: Cell[][]
  start: { x: number; y: number }
  end: { x: number; y: number }
}

// Generate a maze using recursive backtracking
export function generateMaze(width: number, height: number): Maze {
  // Initialize cells with all walls
  const cells: Cell[][] = Array(height)
    .fill(0)
    .map((_, y) =>
      Array(width)
        .fill(0)
        .map((_, x) => ({
          x,
          y,
          walls: { top: true, right: true, bottom: true, left: true },
          visited: false,
          isStart: false,
          isEnd: false,
          isPath: false,
          isExplored: false,
        })),
    )

  // Choose random start and end points
  const start = { x: 0, y: Math.floor(Math.random() * height) }
  const end = { x: width - 1, y: Math.floor(Math.random() * height) }

  cells[start.y][start.x].isStart = true
  cells[end.y][end.x].isEnd = true

  // Recursive backtracking to generate maze
  function carve(x: number, y: number) {
    cells[y][x].visited = true

    // Define possible directions: [dx, dy]
    const directions = [
      [0, -1], // top
      [1, 0], // right
      [0, 1], // bottom
      [-1, 0], // left
    ]

    // Shuffle directions for randomness
    for (let i = directions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[directions[i], directions[j]] = [directions[j], directions[i]]
    }

    // Try each direction
    for (const [dx, dy] of directions) {
      const nx = x + dx
      const ny = y + dy

      // Check if the new position is valid
      if (nx >= 0 && nx < width && ny >= 0 && ny < height && !cells[ny][nx].visited) {
        // Remove walls between current cell and next cell
        if (dx === 0 && dy === -1) {
          // top
          cells[y][x].walls.top = false
          cells[ny][nx].walls.bottom = false
        } else if (dx === 1 && dy === 0) {
          // right
          cells[y][x].walls.right = false
          cells[ny][nx].walls.left = false
        } else if (dx === 0 && dy === 1) {
          // bottom
          cells[y][x].walls.bottom = false
          cells[ny][nx].walls.top = false
        } else if (dx === -1 && dy === 0) {
          // left
          cells[y][x].walls.left = false
          cells[ny][nx].walls.right = false
        }

        // Recursively carve from the next cell
        carve(nx, ny)
      }
    }
  }

  // Start carving from the start position
  carve(start.x, start.y)

  // Reset visited flags for pathfinding
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      cells[y][x].visited = false
    }
  }

  return { width, height, cells, start, end }
}

// Find a path through the maze using A* algorithm
export function findPath(maze: Maze): { path: { x: number; y: number }[]; explored: { x: number; y: number }[] } {
  const { start, end, cells, width, height } = maze

  // Priority queue for A* algorithm
  const openSet: { x: number; y: number; f: number; g: number; parent: { x: number; y: number } | null }[] = []
  const closedSet = new Set<string>()
  const explored: { x: number; y: number }[] = []

  // Helper to get a unique key for a position
  const getKey = (x: number, y: number) => `${x},${y}`

  // Heuristic function (Manhattan distance)
  const heuristic = (x: number, y: number) => Math.abs(x - end.x) + Math.abs(y - end.y)

  // Add start node to open set
  openSet.push({
    x: start.x,
    y: start.y,
    f: heuristic(start.x, start.y),
    g: 0,
    parent: null,
  })

  // Keep track of parents for reconstructing the path
  const parents = new Map<string, { x: number; y: number }>()

  while (openSet.length > 0) {
    // Sort by f score and get the best node
    openSet.sort((a, b) => a.f - b.f)
    const current = openSet.shift()!
    const currentKey = getKey(current.x, current.y)

    // Add to explored cells
    explored.push({ x: current.x, y: current.y })

    // Check if we reached the end
    if (current.x === end.x && current.y === end.y) {
      // Reconstruct path
      const path: { x: number; y: number }[] = []
      let curr: { x: number; y: number } | null = { x: current.x, y: current.y }

      while (curr) {
        path.unshift({ x: curr.x, y: curr.y })
        const key = getKey(curr.x, curr.y)
        curr = parents.get(key) || null
      }

      return { path, explored }
    }

    // Add to closed set
    closedSet.add(currentKey)

    // Check neighbors
    const neighbors: { x: number; y: number }[] = []
    const { walls } = cells[current.y][current.x]

    // Add accessible neighbors (where there's no wall)
    if (!walls.top && current.y > 0) neighbors.push({ x: current.x, y: current.y - 1 })
    if (!walls.right && current.x < width - 1) neighbors.push({ x: current.x + 1, y: current.y })
    if (!walls.bottom && current.y < height - 1) neighbors.push({ x: current.x, y: current.y + 1 })
    if (!walls.left && current.x > 0) neighbors.push({ x: current.x - 1, y: current.y })

    for (const neighbor of neighbors) {
      const neighborKey = getKey(neighbor.x, neighbor.y)

      // Skip if in closed set
      if (closedSet.has(neighborKey)) continue

      // Calculate g score (distance from start)
      const tentativeG = current.g + 1

      // Find if neighbor is in open set
      const existingNeighbor = openSet.find((n) => n.x === neighbor.x && n.y === neighbor.y)

      if (!existingNeighbor) {
        // Add to open set
        openSet.push({
          x: neighbor.x,
          y: neighbor.y,
          g: tentativeG,
          f: tentativeG + heuristic(neighbor.x, neighbor.y),
          parent: { x: current.x, y: current.y },
        })

        // Save parent
        parents.set(neighborKey, { x: current.x, y: current.y })
      } else if (tentativeG < existingNeighbor.g) {
        // Update existing neighbor
        existingNeighbor.g = tentativeG
        existingNeighbor.f = tentativeG + heuristic(neighbor.x, neighbor.y)
        existingNeighbor.parent = { x: current.x, y: current.y }

        // Update parent
        parents.set(neighborKey, { x: current.x, y: current.y })
      }
    }
  }

  // No path found
  return { path: [], explored }
}

