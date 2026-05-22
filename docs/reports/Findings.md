**Findings**
1. High: the WebSocket `join` flow tears down connection-level accounting without closing the socket. `join` calls game-mp.ts `removePeer(peer)`, but `removePeer` also decrements the per-IP connection count and clears the per-peer rate-limit entry in game-mp.ts. The connection-limit check only happens in game-mp.ts. Result: after a client joins once, that socket no longer counts toward `MAX_CONNS_PER_IP`, and a re-join resets its rate limiter. This is the main attack vector for DoS and memory exhaustion. `getPeerIp` in game-mp.ts also trusts raw `x-forwarded-for`, so the protection is even weaker unless a trusted proxy strips and rewrites that header.

2. Medium: multiplayer rooms have no real authentication. The only gate is an Origin equality check in game-mp.ts, but non-browser WebSocket clients can forge `Origin`. Once someone knows a room code, the join path in game-mp.ts lets them see every player’s shared state and inject their own state into the room. Room creation in MultiplayerSetup.vue is only a 6-character code, and the server accepts any 4-10 character uppercase/alnum code in game-mp.ts. That is fine for casual play, but it is not privacy-grade access control.

3. Medium: there is one concrete client-side RAM/CPU leak. `useSudoku()` starts a repeating interval in useSudoku.ts and restarts it on generate/reset in useSudoku.ts, but the page unmount path in sudoku.vue only removes the keyboard listener. Navigating away from `/sudoku` leaves the timer alive until full reload, so repeated visits accumulate live intervals and retained reactive state.

4. Low: the WebSocket size checks are character-based, not byte-based. The handler limits `raw.length` and `stateJson.length` in game-mp.ts and game-mp.ts. With multibyte UTF-8 payloads, a client can exceed the intended 8 KB / 4 KB budget and put more pressure on parsing and memory than those limits suggest.

5. Low: the production container runs as root. The runtime stage in Dockerfile never sets a non-root `USER`. That is not an exploit by itself, but it increases blast radius if a future Node/Nitro bug ever becomes remotely exploitable.

**Cache / RAM**
I do not see an unbounded service-worker cache leak. Workbox cleanup is enabled and all runtime caches are capped in nuxt.config.ts. Game history storage is also bounded to 20 entries per game in useGameHistory.ts.

On the server, I do not see a passive Map leak: empty rooms are deleted in game-mp.ts. The memory risk is adversarial, not accidental: finding 1 lets attackers keep many sockets alive while bypassing the intended accounting. Separate from that, some localStorage state is user-driven and uncapped, especially notepad state in useNotepad.ts and Phase 10 scores in usePhase10.ts. That can hit browser quota over time, but it is not a remote attack path on its own.

I also did not find an obvious XSS sink in the app code on this pass; there was no `v-html`, `innerHTML`, or `eval` usage in the application sources I checked.

**Gaps**
This was a static review. I could not complete `pnpm audit --prod` because it prompted for an SSH key passphrase, so this review does not include registry-backed dependency CVE results. I also did not find CSP, HSTS, `X-Frame-Options`, or similar header configuration in the repo; if those are not injected by the reverse proxy, browser-side hardening is light.

1. Split connection teardown from room-leave cleanup in the WebSocket server so `join` does not clear `connPerIp` or `peerRateMap`; only actual socket close should do that.
2. Add unmount cleanup for the Sudoku timer, ideally inside `useSudoku()` itself.
3. If multiplayer privacy matters, add authenticated room membership or signed invite tokens, and add standard security headers at the edge.