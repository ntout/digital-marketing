import { cn } from './utils'

describe('cn', () => {
  it('merges truthy classes and resolves Tailwind collisions', () => {
    expect(cn('px-2', false && 'hidden', 'px-4', 'text-sm')).toBe('px-4 text-sm')
  })
})
