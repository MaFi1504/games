# Security Audit Report

**Date:** 2026-05-22
**Scope:** WebSocket multiplayer server (`server/api/game-mp.ts`) and client composables

---

## Summary

| # | Title | Severity | Status |
|---|-------|----------|--------|
| 1 | No rate limiting on WebSocket messages | Critical | Fixed |
| 2 | Unbounded room creation → memory exhaustion | High | Fixed |
| 3 | Session hijacking via `playerId` collision + `Math.random()` | High | Fixed |
| 4 | No WebSocket connection limit per IP | High | Fixed |
| 5 | No Origin header validation (CSWSH) | Medium | Fixed |
| 6 | Orphaned connections on full-room rejection | Low | Fixed |
| 7 | Raw message not size-checked before `JSON.parse` | Low | Fixed |

---

## Findings

### 1 — No Rate Limiting on WebSocket Messages (Critical)

**File:** `server/api/game-mp.ts`, `message()` handler

**Description:**
Every incoming WebSocket frame is processed immediately with no throttle. The `update` handler calls `broadcast()` which fans the message out to every peer in the room (up to `MAX_ROOM_SIZE = 10`). One client sending N messages/sec causes up to 10 × N outbound sends/sec on the server.

**Attack scenario:**
```
Open 10 connections in one room.
Flood update messages from one connection at maximum speed.
→ Server spends all CPU serialising and sending to all 10 peers.
→ Repeated across multiple rooms → full server saturation.
```

**Fix:**
Implement a per-peer token-bucket or sliding-window counter inside the `message` handler. Example: allow at most 20 messages per peer per second; drop (or close the connection on) excess frames.

```ts
// sketch
const peerRateMap = new Map<string, { count: number; reset: number }>()
const RATE_LIMIT = 20 // messages per second

function checkRate(peerId: string): boolean {
  const now = Date.now()
  const entry = peerRateMap.get(peerId) ?? { count: 0, reset: now + 1000 }
  if (now > entry.reset) { entry.count = 0; entry.reset = now + 1000 }
  entry.count++
  peerRateMap.set(peerId, entry)
  return entry.count <= RATE_LIMIT
}
```

---

### 2 — Unbounded Room Creation → Memory Exhaustion (High)

**File:** `server/api/game-mp.ts`

**Description:**
The `rooms` Map has no upper-bound. Each valid `join` with a new room code creates a new entry. State blobs can be up to 4 096 bytes each (10 players/room), so an adversary can allocate roughly `MAX_ROOM_SIZE × STATE_JSON_MAX = 40 KB` of state per room, plus overhead for the `PlayerEntry` objects and their WebSocket peers.

**Attack scenario:**
```
for i in 1..∞:
  open 1 WS connection
  send { type:'join', room: unique_code_i, ... }
  → server creates a new room entry every iteration
→ Node.js heap exhausted, process OOMs or GC stalls freeze the event loop
```

**Fix:**
Add a `MAX_ROOMS` constant and reject `join` when the limit is reached:

```ts
const MAX_ROOMS = 1000

if (!rooms.has(roomKey) && rooms.size >= MAX_ROOMS) {
  peer.send(JSON.stringify({ type: 'error', message: 'Server is full' }))
  return
}
```

---

### 3 — Session Hijacking via `playerId` Collision + `Math.random()` (High)

**Files:** `server/api/game-mp.ts`, `app/composables/useMultiplayer.ts`

**Description — collision:**
The server uses `room.set(playerId, entry)` without checking whether the `playerId` is already occupied. If an attacker joins with a known (or guessed) `playerId`, the existing player's entry is silently overwritten — their game connection is stolen.

**Description — weak ID generation:**
Player IDs are generated with `Math.random()`, which is not a CSPRNG. In environments where the PRNG state is observable or seeded predictably, IDs can be enumerated.

```ts
// useMultiplayer.ts — insecure
function generateId(): string {
  return (Math.random().toString(36).slice(2, 10)
        + Math.random().toString(36).slice(2, 10)).slice(0, 16)
}
```

**Fix 1 — use a CSPRNG:**
```ts
function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '')
}
```

**Fix 2 — server-side collision rejection:**
```ts
if (type === 'join') {
  // ...
  if (room.has(playerId)) {
    peer.send(JSON.stringify({ type: 'error', message: 'Player ID already taken' }))
    return
  }
  // ...
}
```

---

### 4 — No WebSocket Connection Limit Per IP (High)

**File:** `server/api/game-mp.ts` (and Nitro/reverse-proxy config)

**Description:**
There is no check on how many concurrent WebSocket connections a single IP address may hold. An attacker can open thousands of idle connections, exhausting the server's file-descriptor limit and the memory consumed by the `peerMeta` and `rooms` Maps.

**Fix:**
Apply connection limiting at the reverse-proxy layer (preferred) or in a Nitro server middleware:

```nginx
# nginx example
limit_conn_zone $binary_remote_addr zone=ws_per_ip:10m;
limit_conn ws_per_ip 20;
```

Or in `server/middleware/ws-limit.ts`:
```ts
const connPerIp = new Map<string, number>()
const MAX_CONNS_PER_IP = 20

export default defineEventHandler((event) => {
  const ip = getRequestIP(event) ?? 'unknown'
  const current = connPerIp.get(ip) ?? 0
  if (current >= MAX_CONNS_PER_IP) {
    throw createError({ statusCode: 429, message: 'Too many connections' })
  }
  connPerIp.set(ip, current + 1)
  // decrement on close — hook into the WS close event or use a WeakRef cleanup
})
```

---

### 5 — No Origin Header Validation / CSWSH (Medium)

**File:** `server/api/game-mp.ts`

**Description:**
The WebSocket upgrade handler accepts connections from any `Origin`. A Cross-Site WebSocket Hijacking (CSWSH) attack allows a malicious third-party page, loaded in the victim's browser, to open a WebSocket to this server. Because there are no session cookies involved the data-exfiltration risk is limited, but the server can still be used to generate load and spam rooms.

**Fix:**
Validate the `Origin` header before accepting the upgrade. In a Nitro WebSocket handler this can be done in an `upgrade` hook:

```ts
export default defineWebSocketHandler({
  upgrade(request) {
    const origin = request.headers.get('origin') ?? ''
    const allowed = process.env.NUXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    if (!origin.startsWith(allowed)) {
      return new Response('Forbidden', { status: 403 })
    }
  },
  // ...
})
```

---

### 6 — Orphaned Connections on Full-Room Rejection (Low)

**File:** `server/api/game-mp.ts`, `join` branch

**Description:**
When a room is full the handler:
1. Calls `removePeer(peer)` — removes the peer from any previous room and deletes its `peerMeta` entry.
2. Sends a `{ type: 'error', message: 'Room is full' }` message.
3. Returns without adding the peer to `peerMeta` or any room.

The TCP/WebSocket connection stays open until the client decides to close it. The server holds the file descriptor and `ws` object in memory indefinitely with no way to clean it up (the `close` handler calls `removePeer` which is now a no-op for this peer).

**Fix:**
Close the peer server-side after sending the rejection:
```ts
if (room.size >= MAX_ROOM_SIZE) {
  peer.send(JSON.stringify({ type: 'error', message: 'Room is full' }))
  peer.close()  // <-- add this
  return
}
```

---

### 7 — Raw Message Not Size-Checked Before `JSON.parse` (Low)

**File:** `server/api/game-mp.ts`, top of `message()` handler

**Description:**
The handler calls `JSON.parse(message.text())` before any size check. A large or pathologically nested JSON payload is fully parsed into memory before `STATE_JSON_MAX` is ever evaluated. Extremely large messages can cause GC pressure; deeply nested objects can cause excessive call-stack usage in some runtimes.

**Fix:**
Reject oversized messages before parsing:
```ts
message(peer, message) {
  const raw = message.text()
  if (raw.length > 8192) return  // hard cap before parse

  let data: Record<string, unknown>
  try {
    data = JSON.parse(raw)
  } catch {
    return
  }
  // ...
}
```

---

## Non-Issues (Confirmed Safe)

| Concern | Verdict |
|---------|---------|
| XSS via player name rendered in templates | **Safe** — all `{{ player.name }}` usages go through Vue's auto-escaping; no `v-html` found anywhere in the codebase |
| `localStorage` injection | **Safe** — stored data is only read back into typed game state, never rendered as raw HTML |
| Malicious `state` object injected into peer clients | **Low risk** — server enforces `typeof state === 'object'` and size limit; clients treat state as typed TS interfaces and ignore unknown fields |
