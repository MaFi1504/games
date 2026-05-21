import type { Peer } from 'crossws'

// The game discriminator tells the server which game the room is for.
// Rooms are namespaced per game so "ABC123" in phase10 is separate from "ABC123" in kniffel.
export type GameId = 'phase10' | 'kniffel' | 'notepad'

const VALID_GAMES = new Set<GameId>(['phase10', 'kniffel', 'notepad'])

// Per-player state: identity fields are managed by the server; `state` is an
// opaque JSON blob sent by the client. We only size-limit it — no game-specific
// validation happens here.
interface PlayerEntry {
  peer: Peer
  roomKey: string // `${gameId}:${roomCode}`
  playerId: string
  name: string
  state: unknown // game-specific, validated on the client
}

// In-memory store: roomKey → (playerId → PlayerEntry)
const rooms = new Map<string, Map<string, PlayerEntry>>()
// Reverse lookup: peer.id → { roomKey, playerId }
const peerMeta = new Map<string, { roomKey: string, playerId: string }>()

const MAX_ROOM_SIZE = 10
const ROOM_CODE_RE = /^[A-Z0-9]{4,10}$/
const PLAYER_ID_RE = /^[a-z0-9]{8,20}$/
const NAME_MAX = 30
const STATE_JSON_MAX = 4096

function toRoomKey(gameId: GameId, roomCode: string): string {
  return `${gameId}:${roomCode}`
}

function broadcast(roomKey: string) {
  const room = rooms.get(roomKey)
  if (!room) return
  const players = Array.from(room.values()).map(e => ({
    playerId: e.playerId,
    name: e.name,
    state: e.state
  }))
  const msg = JSON.stringify({ type: 'players', players })
  for (const entry of room.values()) {
    try {
      entry.peer.send(msg)
    } catch {
      // no-op: peer may have disconnected
    }
  }
}

function removePeer(peer: Peer) {
  const meta = peerMeta.get(peer.id)
  if (!meta) return
  peerMeta.delete(peer.id)
  const room = rooms.get(meta.roomKey)
  if (!room) return
  room.delete(meta.playerId)
  if (room.size === 0) {
    rooms.delete(meta.roomKey)
  } else {
    broadcast(meta.roomKey)
  }
}

export default defineWebSocketHandler({
  message(peer, message) {
    let data: Record<string, unknown>
    try {
      data = JSON.parse(message.text())
    } catch {
      return
    }

    const type = String(data.type ?? '')
    const gameId = String(data.game ?? '') as GameId
    const roomCode = String(data.room ?? '').toUpperCase().trim()
    const playerId = String(data.playerId ?? '').trim()

    if (!VALID_GAMES.has(gameId) || !ROOM_CODE_RE.test(roomCode) || !PLAYER_ID_RE.test(playerId)) return

    const roomKey = toRoomKey(gameId, roomCode)

    if (type === 'join') {
      const name = String(data.name ?? '').trim().slice(0, NAME_MAX)
      if (!name) return

      removePeer(peer)

      if (!rooms.has(roomKey)) rooms.set(roomKey, new Map())
      const room = rooms.get(roomKey)!

      if (room.size >= MAX_ROOM_SIZE) {
        peer.send(JSON.stringify({ type: 'error', message: 'Room is full' }))
        return
      }

      const entry: PlayerEntry = { peer, roomKey, playerId, name, state: null }
      room.set(playerId, entry)
      peerMeta.set(peer.id, { roomKey, playerId })

      peer.send(JSON.stringify({ type: 'joined', game: gameId, room: roomCode }))
      broadcast(roomKey)
    } else if (type === 'update') {
      const meta = peerMeta.get(peer.id)
      if (!meta || meta.roomKey !== roomKey || meta.playerId !== playerId) return

      const room = rooms.get(roomKey)
      if (!room?.has(playerId)) return

      // Validate the state blob is an object and within size limits
      const rawState = data.state
      if (rawState === null || typeof rawState !== 'object' || Array.isArray(rawState)) return
      const stateJson = JSON.stringify(rawState)
      if (stateJson.length > STATE_JSON_MAX) return

      const entry = room.get(playerId)!
      entry.state = rawState
      broadcast(roomKey)
    } else if (type === 'leave') {
      const meta = peerMeta.get(peer.id)
      if (meta && meta.roomKey === roomKey && meta.playerId === playerId) {
        removePeer(peer)
      }
    }
  },

  close(peer) {
    removePeer(peer)
  }
})
