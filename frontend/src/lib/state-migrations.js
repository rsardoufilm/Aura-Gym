/**
 * Aura Gym — safe local-state migration and recovery helpers.
 *
 * Storage keys are deliberately unchanged. This module only adds a verified
 * last-known-good snapshot and quarantines malformed data before recovery.
 * It never clears owner/session/sync metadata and never migrates between users.
 */

export const STATE_KEY = 'gym_state_v1'
export const STATE_BACKUP_KEY = 'gym_state_v1.last_known_good'
export const STATE_QUARANTINE_KEY = 'gym_state_v1.corrupt_backup'

const STATE_MARKERS = [
  'workouts', 'routines', 'bodyweight', 'customEx',
  'active', 'unit', 'week', 'measurements',
]

export function isUsableState(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return STATE_MARKERS.some(key => Object.prototype.hasOwnProperty.call(value, key))
}

function parseState(raw) {
  if (typeof raw !== 'string' || !raw) return null
  try {
    const value = JSON.parse(raw)
    return isUsableState(value) ? value : null
  } catch {
    return null
  }
}

/**
 * Preserve the exact damaged bytes once. Never overwrite an existing
 * quarantine copy: it may be the only recoverable version.
 */
export function quarantineCorruptState(storage, raw) {
  if (!storage || typeof raw !== 'string' || !raw) return false
  try {
    if (storage.getItem(STATE_QUARANTINE_KEY) == null) {
      storage.setItem(STATE_QUARANTINE_KEY, raw)
    }
    return true
  } catch (error) {
    console.error('[Aura Gym] Could not quarantine corrupt state:', error)
    return false
  }
}

/**
 * Keep a last-known-good snapshot before replacing the primary state.
 * Backup failure is non-fatal: the primary save must still be attempted.
 */
export function backupStateBeforeWrite(storage, nextRaw) {
  if (!storage || typeof nextRaw !== 'string' || !parseState(nextRaw)) return false
  try {
    const currentRaw = storage.getItem(STATE_KEY)
    if (currentRaw && parseState(currentRaw)) {
      storage.setItem(STATE_BACKUP_KEY, currentRaw)
      return true
    }
  } catch (error) {
    console.warn('[Aura Gym] Last-known-good snapshot unavailable:', error)
  }
  return false
}

/**
 * Read current state, falling back to the verified backup if current data
 * is malformed. The malformed raw value remains recoverable in quarantine.
 */
export function readSafeState(storage) {
  if (!storage) return { state: null, source: 'unavailable' }

  let raw
  try {
    raw = storage.getItem(STATE_KEY)
  } catch (error) {
    console.error('[Aura Gym] Local storage read failed:', error)
    return { state: null, source: 'unavailable', error }
  }

  if (raw == null) return { state: null, source: 'empty' }

  const current = parseState(raw)
  if (current) return { state: current, source: 'primary' }

  quarantineCorruptState(storage, raw)

  try {
    const backupRaw = storage.getItem(STATE_BACKUP_KEY)
    const backup = parseState(backupRaw)
    if (backup) {
      // Restore the original bytes only after validating the backup.
      try {
        storage.setItem(STATE_KEY, backupRaw)
      } catch (error) {
        console.warn('[Aura Gym] Could not restore primary state:', error)
      }
      return { state: backup, source: 'backup' }
    }
  } catch (error) {
    console.error('[Aura Gym] Backup read failed:', error)
    return { state: null, source: 'corrupt', error }
  }

  return { state: null, source: 'corrupt' }
}

/**
 * Version marker for future schema migrations. No legacy key is guessed or
 * deleted here: a migration is added only after its real source is verified.
 */
export function markStorageSchema(storage, version = 1) {
  try {
    storage?.setItem('aura_gym_storage_schema', String(version))
    return true
  } catch (error) {
    console.warn('[Aura Gym] Could not write storage schema marker:', error)
    return false
  }
}
