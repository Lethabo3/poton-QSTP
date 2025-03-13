/**
 * Complex number representation and operations
 */
export interface Complex {
  real: number
  imag: number
}

export type ComplexMatrix = Complex[][]

export const complex = (real: number, imag: number): Complex => ({ real, imag })

// Common complex number constants
export const ZERO = complex(0, 0)
export const ONE = complex(1, 0)
export const I = complex(0, 1)

// Complex number operations
export const add = (a: Complex, b: Complex): Complex => ({
  real: a.real + b.real,
  imag: a.imag + b.imag,
})

export const subtract = (a: Complex, b: Complex): Complex => ({
  real: a.real - b.real,
  imag: a.imag - b.imag,
})

export const multiply = (a: Complex, b: Complex): Complex => ({
  real: a.real * b.real - a.imag * b.imag,
  imag: a.real * b.imag + a.imag * b.real,
})

export const scale = (a: Complex, scalar: number): Complex => ({
  real: a.real * scalar,
  imag: a.imag * scalar,
})

export const conjugate = (a: Complex): Complex => ({
  real: a.real,
  imag: -a.imag,
})

export const magnitude = (a: Complex): number => Math.sqrt(a.real * a.real + a.imag * a.imag)

export const phase = (a: Complex): number => Math.atan2(a.imag, a.real)

export const exp = (a: Complex): Complex => {
  const expReal = Math.exp(a.real)
  return {
    real: expReal * Math.cos(a.imag),
    imag: expReal * Math.sin(a.imag),
  }
}

