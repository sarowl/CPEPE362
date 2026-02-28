// jest.setup.ts
import '@testing-library/jest-dom'
import { beforeEach, beforeAll, afterAll } from '@jest/globals'

// Clear localStorage between tests
beforeEach(() => localStorage.clear())

// Suppress console.error noise from React in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('ReactDOM.render')) return
    originalError(...args)
  }
})
afterAll(() => { console.error = originalError })