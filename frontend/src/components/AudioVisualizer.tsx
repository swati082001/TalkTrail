import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

export interface AudioVisualizerProps {
  analyser: AnalyserNode | null
  bars?: number
  className?: string
}

const MIN_SCALE = 0.08

export function AudioVisualizer({ analyser, bars = 32, className }: AudioVisualizerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const barEls = Array.from(container.children).filter((el): el is HTMLElement => el instanceof HTMLElement)

    if (!analyser) {
      barEls.forEach((el) => (el.style.transform = `scaleY(${MIN_SCALE})`))
      return
    }

    const data = new Uint8Array(analyser.frequencyBinCount)
    const usableBins = Math.max(1, Math.floor(data.length * 0.7))
    const center = (barEls.length - 1) / 2
    let frame = 0

    const tick = () => {
      analyser.getByteFrequencyData(data)
      barEls.forEach((el, i) => {
        const distance = center === 0 ? 0 : Math.abs(i - center) / center
        const bin = Math.min(usableBins - 1, Math.floor(distance * usableBins))
        const value = (data[bin] ?? 0) / 255
        el.style.transform = `scaleY(${Math.max(MIN_SCALE, value)})`
      })
      frame = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(frame)
  }, [analyser, bars])

  return (
    <div ref={containerRef} className={cn('flex h-16 items-center justify-center gap-[3px]', className)} aria-hidden="true">
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-full w-1 origin-center rounded-full transition-transform duration-75',
            analyser ? 'bg-gradient-to-t from-violet-500 to-fuchsia-400' : 'bg-muted-foreground/25',
          )}
          style={{ transform: `scaleY(${MIN_SCALE})` }}
        />
      ))}
    </div>
  )
}
