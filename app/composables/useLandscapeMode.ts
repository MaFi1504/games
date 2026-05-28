/**
 * Forces a page to appear in landscape orientation via a CSS transform rotation.
 *
 * How it works:
 *  - On a rotation-locked phone the device stays in portrait even when physically
 *    rotated.  The Screen Orientation API (screen.orientation.lock) only works in
 *    a fullscreen context on Android and is completely unsupported on iOS.
 *  - The CSS transform approach instead keeps the viewport as-is and rotates the
 *    *content* 90 ° clockwise, then re-positions it so it fills the portrait
 *    viewport as if it were landscape:
 *
 *      Portrait viewport  W × H
 *      ┌────────────────┐
 *      │  ←── W ──→     │  H
 *      │                │
 *      └────────────────┘
 *
 *      We place a child div of size H × W, rotate it 90 ° CW, and shift it so
 *      the top-left corner lands at (0, 0):
 *
 *        transform-origin: top left
 *        width:  100vh   (= H  →  becomes landscape width after rotation)
 *        height: 100vw   (= W  →  becomes landscape height after rotation)
 *        transform: rotate(90deg) translateY(-100%)
 *        position: fixed; top: 0; left: 0;
 *
 *  - When the device is already in landscape (or the user has auto-rotate on and
 *    has rotated) the composable detects this and skips the transform.
 *
 * Returns:
 *  - `isPortrait`  – reactive boolean, true when the viewport is taller than wide
 *  - `wrapperStyle` – CSS style object to bind to the landscape wrapper element
 */
export function useLandscapeMode() {
  const isPortrait = ref(false)

  const measure = () => {
    if (!import.meta.client) return
    isPortrait.value = window.innerWidth < window.innerHeight
  }

  onMounted(() => {
    measure()
    window.addEventListener('resize', measure)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', measure)
  })

  /**
   * Style object for the wrapper div.
   *
   * In landscape (or when already in landscape) → no style (normal flow).
   * In portrait → fixed position + rotate so content appears landscape.
   */
  const wrapperStyle = computed(() => {
    if (!isPortrait.value) return {}
    return {
      position: 'fixed' as const,
      top: '0',
      left: '0',
      width: '100vh',
      height: '100vw',
      transformOrigin: 'top left',
      // rotate(90deg) swings the TL corner to portrait bottom-left (0, 100vw);
      // translateY(-100%) = -100vw pulls it back up so TL lands at (0,0)
      // and the element fills the full portrait viewport.
      // paddingTop shifts all inner content away from the element's "top" edge,
      // which after 90° CW rotation becomes the LEFT edge of the landscape view —
      // exactly the strip covered by the UApp header (z-50 sits above z-index:1).
      transform: 'rotate(90deg) translateY(-100%)',
      paddingTop: '64px',
      overflow: 'auto',
      zIndex: '1'
    }
  })

  return { isPortrait, wrapperStyle }
}
