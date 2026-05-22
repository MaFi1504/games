import { ref, computed, onUnmounted } from 'vue'
import type { GameId } from '../server/api/game-mp'

export interface MultiplayerPlayer<TState> {
  playerId: string
  name: string
  state: TState | null
}

export interface UseMultiplayerOptions {
  game: GameId
}

export function useMultiplayer<TState>(options: UseMultiplayerOptions) {
  const ws = ref<WebSocket | null>(null)
  const playerId = ref('')
  const roomCode = ref('')
  const playerName = ref('')
  const connected = ref(false)
  const connecting = ref(false)
  const players = ref<MultiplayerPlayer<TState>[]>([])
  const connectionError = ref<string | null>(null)

  const otherPlayers = computed(() =>
    players.value.filter(p => p.playerId !== playerId.value)
  )

  function generateId(): string {
    return crypto.randomUUID().replace(/-/g, '')
  }

  function generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }

  function closeSocket() {
    if (!ws.value) return
    if (ws.value.readyState === WebSocket.OPEN && roomCode.value && playerId.value) {
      ws.value.send(JSON.stringify({
        type: 'leave',
        game: options.game,
        room: roomCode.value,
        playerId: playerId.value
      }))
    }
    ws.value.close()
    ws.value = null
    connected.value = false
    connecting.value = false
    players.value = []
  }

  function connect(room: string, name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      closeSocket()
      roomCode.value = room.toUpperCase().trim()
      playerName.value = name.trim()
      playerId.value = generateId()
      connectionError.value = null
      connecting.value = true

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const socket = new WebSocket(`${protocol}//${window.location.host}/api/game-mp`)
      ws.value = socket

      const timeout = setTimeout(() => {
        socket.close()
        connecting.value = false
        connectionError.value = 'timeout'
        reject(new Error('timeout'))
      }, 8000)

      socket.onopen = () => {
        socket.send(JSON.stringify({
          type: 'join',
          game: options.game,
          room: roomCode.value,
          playerId: playerId.value,
          name: playerName.value
        }))
      }

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(String(event.data))
          if (data.type === 'joined') {
            clearTimeout(timeout)
            connecting.value = false
            connected.value = true
            resolve()
          } else if (data.type === 'players') {
            players.value = data.players as MultiplayerPlayer<TState>[]
          } else if (data.type === 'error') {
            clearTimeout(timeout)
            connecting.value = false
            connectionError.value = data.message
            reject(new Error(data.message))
          }
        } catch {
          // no-op: invalid JSON message ignored
        }
      }

      socket.onerror = () => {
        clearTimeout(timeout)
        connecting.value = false
        connectionError.value = 'failed'
        connected.value = false
        reject(new Error('failed'))
      }

      socket.onclose = () => {
        clearTimeout(timeout)
        connecting.value = false
        connected.value = false
      }
    })
  }

  function sendUpdate(state: TState) {
    if (!ws.value || ws.value.readyState !== WebSocket.OPEN || !connected.value) return
    ws.value.send(JSON.stringify({
      type: 'update',
      game: options.game,
      room: roomCode.value,
      playerId: playerId.value,
      state
    }))
  }

  onUnmounted(closeSocket)

  return {
    playerId,
    roomCode,
    playerName,
    connected,
    connecting,
    players,
    otherPlayers,
    connectionError,
    generateRoomCode,
    connect,
    sendUpdate,
    close: closeSocket
  }
}
