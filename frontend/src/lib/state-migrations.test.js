import { describe, expect, it, beforeEach } from 'vitest'
import {
  STATE_KEY, STATE_BACKUP_KEY, STATE_QUARANTINE_KEY,
  backupStateBeforeWrite, readSafeState, isUsableState,
} from './state-migrations.js'

describe('Aura Gym safe local-state recovery', () => {
  let storage
  beforeEach(() => { storage = new MapStorage() })

  it('accepts a legacy state shape without renaming its keys', () => {
    const state = { workouts: [{ id: 'w1' }], active: { id: 'a1' } }
    storage.setItem(STATE_KEY, JSON.stringify(state))
    expect(readSafeState(storage)).toMatchObject({ state, source: 'primary' })
  })

  it('backs up the last valid state before a new write', () => {
    const oldState = { workouts: [{ id: 'old' }] }
    const nextState = { workouts: [{ id: 'new' }] }
    storage.setItem(STATE_KEY, JSON.stringify(oldState))
    expect(backupStateBeforeWrite(storage, JSON.stringify(nextState))).toBe(true)
    expect(JSON.parse(storage.getItem(STATE_BACKUP_KEY))).toEqual(oldState)
  })

  it('quarantines malformed primary data and restores the verified backup', () => {
    const backup = { workouts: [{ id: 'safe' }] }
    storage.setItem(STATE_KEY, '{broken json')
    storage.setItem(STATE_BACKUP_KEY, JSON.stringify(backup))
    expect(readSafeState(storage)).toMatchObject({ state: backup, source: 'backup' })
    expect(storage.getItem(STATE_QUARANTINE_KEY)).toBe('{broken json')
    expect(JSON.parse(storage.getItem(STATE_KEY))).toEqual(backup)
  })

  it('does not mistake arbitrary JSON for a workout state', () => {
    expect(isUsableState({ token: 'secret' })).toBe(false)
    storage.setItem(STATE_KEY, '{"token":"secret"}')
    expect(readSafeState(storage).source).toBe('corrupt')
    expect(storage.getItem(STATE_QUARANTINE_KEY)).toBe('{"token":"secret"}')
  })

  it('does not overwrite an existing quarantine copy', () => {
    storage.setItem(STATE_QUARANTINE_KEY, '{"workouts":[{"id":"first"}]}')
    storage.setItem(STATE_KEY, 'broken')
    readSafeState(storage)
    expect(storage.getItem(STATE_QUARANTINE_KEY)).toBe('{"workouts":[{"id":"first"}]}')
  })
})

class MapStorage {
  data = new Map()
  getItem(key) { return this.data.has(key) ? this.data.get(key) : null }
  setItem(key, value) { this.data.set(String(key), String(value)) }
  removeItem(key) { this.data.delete(key) }
}
