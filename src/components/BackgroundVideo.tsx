import { useEffect, useRef } from 'react'

const VIDEO_SRC =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260601_110537_3a579fa0-7bbc-4d94-9d25-0e816c7840f5.mp4'

export function BackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // Desktop mouse scrubbing: drag across the window to scrub the video.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let prevX: number | null = null
    let targetTime = 0
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

      const deltaTime = (delta / window.innerWidth) * 0.8 * video.duration
      targetTime = Math.min(Math.max(targetTime + deltaTime, 0), video.duration)
    }

    // Apply the scrub target at most once per frame, and only once the
    // previous seek has resolved (video.seeking) — this keeps rapid mouse
    // deltas from queuing up seeks faster than the browser can service them,
    // which is what makes remote-hosted video feel laggy while scrubbing.
    const applyScrub = () => {
      if (!video.seeking && Math.abs(video.currentTime - targetTime) > 0.01) {
        video.currentTime = targetTime
      }
      rafId = requestAnimationFrame(applyScrub)
    }

    // The rAF loop above checks video.seeking directly, but we still bind
    // this so the browser's own frame-accurate seek completion (rather than
    // a fixed delay) is what unblocks the next write to currentTime.
    const handleSeeked = () => {}

    window.addEventListener('mousemove', handleMouseMove)
    video.addEventListener('seeked', handleSeeked)
    rafId = requestAnimationFrame(applyScrub)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      video.removeEventListener('seeked', handleSeeked)
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
