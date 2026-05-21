/**
 * Reads and parses a JSON value from localStorage.
 * Returns null when called server-side or when the key is absent / data is corrupt.
 */
export function loadFromStorage<T>(key: string): T | null {
  if (!import.meta.client) return null
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as T
  } catch {
    // ignore corrupt data
  }
  return null
}

/**
 * Serialises `data` and writes it to localStorage.
 * No-ops when called server-side.
 */
export function saveToStorage<T>(key: string, data: T): void {
  if (!import.meta.client) return
  localStorage.setItem(key, JSON.stringify(data))
}
