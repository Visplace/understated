import { useEffect, useState } from 'react'

/**
 * Frame sequence scrubbing: instead of seeking a <video> (which is only ever
 * as fast as the source's keyframe spacing allows), a still image is swapped
 * per mouse delta. Once the frames are preloaded, swapping an <img> src to an
 * already-cached URL is effectively instant, so this is smooth regardless of
 * how the source clip was encoded.
 *
 * Drop frames into public/frames/ named frame-001.jpg, frame-002.jpg, ...
 * (any contiguous run works — the count is auto-detected, no need to hardcode
 * how many you end up with).
 */
const FRAME_PATH = (n: number) => `/frames/frame-${String(n).padStart(3, '0')}.jpg`
const MAX_FRAMES_TO_PROBE = 200

/** How much of the sequence a full-width mouse sweep covers. */
const SCRUB_SENSITIVITY = 0.4
/** Easing per frame (0–1) for the on-screen frame catching up to the target. */
const SCRUB_SMOOTHING = 0.18
/** Roughly how fast the mobile auto-cycle advances through frames. */
const MOBILE_FRAME_INTERVAL_MS = 80

function probeFrame(n: number): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = FRAME_PATH(n)
  })
}

async function detectFrameCount(): Promise<number> {
  const results = await Promise.all(
    Array.from({ length: MAX_FRAMES_TO_PROBE }, (_, index) => probeFrame(index + 1)),
  )
  let count = 0
  for (const ok of results) {
    if (!ok) break
    count++
  }
  return count
}

export function BackgroundScrubber() {
  const [frameCount, setFrameCount] = useState(0)
  const [currentFrame, setCurrentFrame] = useState(1)

  useEffect(() => {
    let cancelled = false
    detectFrameCount().then((count) => {
      if (!cancelled) setFrameCount(count)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Desktop mouse scrubbing: drag across the window to move through the frames.
  useEffect(() => {
    if (frameCount < 2) return
    if (window.innerWidth < 1024) return

    let prevX: number | null = null
    let targetFrame = 0
    let displayFrame = 0
    let lastCommitted = -1
    let rafId: number

    const handleMouseMove = (event: MouseEvent) => {
      if (window.innerWidth < 1024) return

      if (prevX === null) {
        prevX = event.clientX
        return
      }

      const delta = event.clientX - prevX
      prevX = event.clientX

      const deltaFrames = (delta / window.innerWidth) * SCRUB_SENSITIVITY * frameCount
      targetFrame = Math.min(Math.max(targetFrame + deltaFrames, 0), frameCount - 1)
    }

    const applyScrub = () => {
      displayFrame += (targetFrame - displayFrame) * SCRUB_SMOOTHING
      const rounded = Math.round(displayFrame)
      if (rounded !== lastCommitted) {
        lastCommitted = rounded
        setCurrentFrame(rounded + 1)
      }
      rafId = requestAnimationFrame(applyScrub)
    }

    window.addEventListener('mousemove', handleMouseMove)
    rafId = requestAnimationFrame(applyScrub)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(rafId)
    }
  }, [frameCount])

  // Mobile: scrubbing is disabled below the lg breakpoint, so auto-cycle instead.
  useEffect(() => {
    if (frameCount < 2) return
    if (window.innerWidth >= 1024) return

    let frame = 0
    const intervalId = setInterval(() => {
      frame = (frame + 1) % frameCount
      setCurrentFrame(frame + 1)
    }, MOBILE_FRAME_INTERVAL_MS)

    return () => clearInterval(intervalId)
  }, [frameCount])

  return (
    <div className="order-last lg:order-none relative lg:absolute lg:inset-0 lg:z-0 overflow-hidden pointer-events-none w-full aspect-square md:aspect-video lg:aspect-auto lg:h-full bg-neutral-50 lg:bg-transparent">
      {frameCount > 0 && (
        <img
          src={FRAME_PATH(currentFrame)}
          alt=""
          draggable={false}
          className="w-full h-full object-cover object-right lg:object-right-bottom"
        />
      )}
    </div>
  )
}
