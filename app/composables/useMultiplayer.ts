import { ref, computed, onUnmounted } from 'vue'
import type { GameId } from '../../server/api/game-mp'

export interface MultiplayerPlayer<TState> {
  playerId: string
  name: string
  state: TState | null
}

export interface UseMultiplayerOptions {
  game: GameId
}

const HEARTBEAT_INTERVAL_MS = 25_000
const HEARTBEAT_TIMEOUT_MS = 10_000
const CONNECT_TIMEOUT_MS = 8_000
const MAX_RECONNECT_ATTEMPTS = 6
const RECONNECT_BASE_MS = 1_000
const RECONNECT_MAX_MS = 30_000

export function useMultiplayer<TState>(options: UseMultiplayerOptions) {
  const ws = ref<WebSocket | null>(null)
  const playerId = ref('')
  const roomCode = ref('')
  const playerName = ref('')
  const connected = ref(false)
  const connecting = ref(false)
  const reconnecting = ref(false)
  const players = ref<MultiplayerPlayer<TState>[]>([])
  const connectionError = ref<string | null>(null)

  let heartbeatTimer: ReturnType<typeof setTimeout> | null = null
  let heartbeatDeadlineTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempts = 0
  // intentional close (leave/unmount) — suppress reconnection
  let intentionalClose = false
  // last state sent, so we can rebroadcast after reconnect
  let lastState: TState | null = null

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

  function clearHeartbeat() {
    if (heartbeatTimer !== null) {
      clearTimeout(heartbeatTimer)
      heartbeatTimer = null
    }
    if (heartbeatDeadlineTimer !== null) {
      clearTimeout(heartbeatDeadlineTimer)
      heartbeatDeadlineTimer = null
    }
  }

  function scheduleHeartbeat(socket: WebSocket) {
    clearHeartbeat()
    heartbeatTimer = setTimeout(() => {
      if (socket.readyState !== WebSocket.OPEN) return
      socket.send(JSON.stringify({ type: 'ping' }))
      // If the server doesn't respond with pong within the deadline, close and reconnect
      heartbeatDeadlineTimer = setTimeout(() => {
        socket.close()
      }, HEARTBEAT_TIMEOUT_MS)
    }, HEARTBEAT_INTERVAL_MS)
  }

  function teardownSocket() {
    clearHeartbeat()
    if (!ws.value) return
    ws.value.onopen = null
    ws.value.onmessage = null
    ws.value.onerror = null
    ws.value.onclose = null
    if (ws.value.readyState === WebSocket.OPEN || ws.value.readyState === WebSocket.CONNECTING) {
      ws.value.close()
    }
    ws.value = null
  }

  function closeSocket() {
    intentionalClose = true
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    reconnectAttempts = 0
    reconnecting.value = false
    if (ws.value?.readyState === WebSocket.OPEN && roomCode.value && playerId.value) {
      ws.value.send(JSON.stringify({
        type: 'leave',
        game: options.game,
        room: roomCode.value,
        playerId: playerId.value
      }))
    }
    teardownSocket()
    connected.value = false
    connecting.value = false
    players.value = []
  }

  function scheduleReconnect() {
    if (intentionalClose || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      reconnecting.value = false
      connectionError.value = 'disconnected'
      return
    }
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempts, RECONNECT_MAX_MS)
    reconnectAttempts++
    reconnecting.value = true
    reconnectTimer = setTimeout(() => openSocket(), delay)
  }

  function openSocket() {
    teardownSocket()
    connecting.value = true

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const socket = new WebSocket(`${protocol}//${window.location.host}/api/game-mp`)
    ws.value = socket

    const connectTimeout = setTimeout(() => {
      socket.close()
    }, CONNECT_TIMEOUT_MS)

    socket.onopen = () => {
      clearTimeout(connectTimeout)
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
          connecting.value = false
          reconnecting.value = false
          connected.value = true
          connectionError.value = null
          reconnectAttempts = 0
          scheduleHeartbeat(socket)
          // Re-broadcast the last known state so other players see us immediately
          if (lastState !== null) {
            socket.send(JSON.stringify({
              type: 'update',
              game: options.game,
              room: roomCode.value,
              playerId: playerId.value,
              state: lastState
            }))
          }
        } else if (data.type === 'pong') {
          // Server is alive — reset the heartbeat cycle
          clearHeartbeat()
          scheduleHeartbeat(socket)
        } else if (data.type === 'players') {
          players.value = data.players as MultiplayerPlayer<TState>[]
        } else if (data.type === 'error') {
          clearTimeout(connectTimeout)
          connecting.value = false
          connectionError.value = data.message
          intentionalClose = true
          socket.close()
        }
      } catch {
        // no-op: invalid JSON message ignored
      }
    }

    socket.onerror = () => {
      clearTimeout(connectTimeout)
      clearHeartbeat()
      connecting.value = false
      connected.value = false
    }

    socket.onclose = () => {
      clearTimeout(connectTimeout)
      clearHeartbeat()
      connecting.value = false
      connected.value = false
      ws.value = null
      if (!intentionalClose) {
        scheduleReconnect()
      }
    }
  }

  function connect(room: string, name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      closeSocket()
      roomCode.value = room.toUpperCase().trim()
      playerName.value = name.trim()
      playerId.value = generateId()
      connectionError.value = null
      intentionalClose = false
      reconnectAttempts = 0

      // We need to capture resolve/reject for the initial connection only
      let settled = false

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const socket = new WebSocket(`${protocol}//${window.location.host}/api/game-mp`)
      ws.value = socket

      const connectTimeout = setTimeout(() => {
        if (!settled) {
          settled = true
          connectionError.value = 'timeout'
          connecting.value = false
          intentionalClose = true
          socket.close()
          reject(new Error('timeout'))
        }
      }, CONNECT_TIMEOUT_MS)

      connecting.value = true

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
            clearTimeout(connectTimeout)
            connecting.value = false
            reconnecting.value = false
            connected.value = true
            connectionError.value = null
            reconnectAttempts = 0
            scheduleHeartbeat(socket)
            if (!settled) {
              settled = true
              resolve()
            }
          } else if (data.type === 'pong') {
            clearHeartbeat()
            scheduleHeartbeat(socket)
          } else if (data.type === 'players') {
            players.value = data.players as MultiplayerPlayer<TState>[]
          } else if (data.type === 'error') {
            clearTimeout(connectTimeout)
            connecting.value = false
            connectionError.value = data.message
            intentionalClose = true
            socket.close()
            if (!settled) {
              settled = true
              reject(new Error(data.message))
            }
          }
        } catch {
          // no-op: invalid JSON message ignored
        }
      }

      socket.onerror = () => {
        clearTimeout(connectTimeout)
        clearHeartbeat()
        connecting.value = false
        connected.value = false
        if (!settled) {
          settled = true
          connectionError.value = 'failed'
          reject(new Error('failed'))
        }
      }

      socket.onclose = () => {
        clearTimeout(connectTimeout)
        clearHeartbeat()
        connecting.value = false
        connected.value = false
        ws.value = null
        if (!settled) {
          settled = true
          connectionError.value = 'failed'
          reject(new Error('failed'))
        } else if (!intentionalClose) {
          scheduleReconnect()
        }
      }
    })
  }

  function sendUpdate(state: TState) {
    lastState = state
    if (!ws.value || ws.value.readyState !== WebSocket.OPEN || !connected.value) return
    ws.value.send(JSON.stringify({
      type: 'update',
      game: options.game,
      room: roomCode.value,
      playerId: playerId.value,
      state
    }))
  }

  // Network change detection: when the browser regains online status or the
  // network interface switches (e.g. WiFi → mobile), immediately attempt to
  // reconnect so the WebSocket can rebind to the new network path.
  function handleOnline() {
    if (intentionalClose || !roomCode.value || !playerId.value) return
    if (connected.value) return
    // Cancel any pending backoff timer and reconnect right away
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    reconnectAttempts = 0
    reconnecting.value = true
    openSocket()
  }

  onUnmounted(() => {
    if (import.meta.client) {
      window.removeEventListener('pagehide', closeSocket)
      window.removeEventListener('online', handleOnline)
    }
    closeSocket()
  })

  if (import.meta.client) {
    window.addEventListener('pagehide', closeSocket, { once: true })
    window.addEventListener('online', handleOnline)
  }

  return {
    playerId,
    roomCode,
    playerName,
    connected,
    connecting,
    reconnecting,
    players,
    otherPlayers,
    connectionError,
    generateRoomCode,
    connect,
    sendUpdate,
    close: closeSocket
  }
}
