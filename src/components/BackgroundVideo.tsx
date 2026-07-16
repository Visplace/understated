import { useEffect, useRef } from 'react'

const VIDEO_SRC =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260601_110537_3a579fa0-7bbc-4d94-9d25-0e816c7840f5.mp4'

/**
 * Scrub feel — the two knobs to tune.
 *
 * SCRUB_SENSITIVITY: how much of the clip a full-width mouse sweep covers.
 *   0.8 = one edge-to-edge sweep scrubs ~80% of the video. Lower it (e.g. 0.4)
 *   to make the video move less per mouse travel (finer control, feels calmer);
 *   raise it toward 1+ to cover more of the clip in a single sweep.
 *
 * SCRUB_SMOOTHING: easing per frame, 0–1. It's how far the video catches up to
 *   the cursor each frame. Higher (e.g. 0.4) = snappier and more responsive but
 *   closer to raw/choppy; lower (e.g. 0.12) = silkier glide but more visible lag
 *   behind the cursor. 0.22 is a middle-ground default.
 */
const SCRUB_SENSITIVITY = 0.01
const SCRUB_SMOOTHING = 1.0
export function BackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // Desktop mouse scrubbing: drag across the window to scrub the video.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let prevX: number | null = null
    let targetTime = 0
    let displayTime = 0
    let rafId: number

    const handleMouseMove = (event: MouseEvent) => {
      if (window.innerWidth < 1024) return
      if (!video.duration) return

      if (prevX === null) {
        prevX = event.clientX
        return
      }

      const delta = event.clientX - prevX
      prevX = event.clientX

      const deltaTime =
        (delta / window.innerWidth) * SCRUB_SENSITIVITY * video.duration
      targetTime = Math.min(Math.max(targetTime + deltaTime, 0), video.duration)
    }

    // fastSeek jumps to the nearest keyframe instead of decoding to an exact
    // frame, which is dramatically cheaper (Safari/Firefox). Chrome hasn't
    // implemented it, so fall back to currentTime there.
    const seekTo = (time: number) => {
      if (typeof video.fastSeek === 'function') {
        video.fastSeek(time)
      } else {
        video.currentTime = time
      }
    }

    // Per-frame loop: ease the on-screen position toward the mouse target so
    // motion decelerates smoothly rather than snapping, and only issue a new
    // seek once the previous one has resolved (video.seeking) so rapid deltas
    // never queue up faster than the browser can decode.
    const applyScrub = () => {
      displayTime += (targetTime - displayTime) * SCRUB_SMOOTHING
      if (!video.seeking && Math.abs(video.currentTime - displayTime) > 0.008) {
        seekTo(displayTime)
      }
      rafId = requestAnimationFrame(applyScrub)
    }

    window.addEventListener('mousemove', handleMouseMove)
    rafId = requestAnimationFrame(applyScrub)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(rafId)
    }
  }, [])

  // Mobile: scrubbing is disabled below the lg breakpoint, so autoplay instead.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (window.innerWidth < 1024) {
      video.autoplay = true
      video.play().catch(() => {})
    }
  }, [])

  return (
    <div className="order-last lg:order-none relative lg:absolute lg:inset-0 lg:z-0 overflow-hidden pointer-events-none w-full aspect-square md:aspect-video lg:aspect-auto lg:h-full bg-neutral-50 lg:bg-transparent">
      <video
        ref={videoRef}
        muted
        playsInline
        preload="auto"
        src={VIDEO_SRC}
        className="w-full h-full object-cover object-right lg:object-right-bottom"
      />
    </div>
  )
}
