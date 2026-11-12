import { describe, expect, it } from 'vitest'
import { formatDuration, formatEuro } from '@tressia/shared'
import { qs } from '../http'

describe('qs', () => {
  it('ignore les valeurs vides et encode le reste', () => {
    expect(qs({ q: 'tresses fines', city: '', page: 2, category: undefined })).toBe('?q=tresses+fines&page=2')
    expect(qs({})).toBe('')
  })
})

describe('formatage partagé', () => {
  it('formate les montants en euros avec séparateur de milliers', () => {
    expect(formatEuro(45)).toBe('45 €')
    expect(formatEuro(1250)).toBe('1 250 €')
  })
  it('formate les durées', () => {
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(60)).toBe('1 h')
    expect(formatDuration(75)).toBe('1 h 15')
  })
})
