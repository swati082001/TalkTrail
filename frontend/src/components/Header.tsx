import { AudioLines } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25">
            <AudioLines className="size-5" aria-hidden="true" />
          </div>
          <div className="leading-tight">
            <h1 className="text-base font-semibold tracking-tight">TalkTrail</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Speak in Hindi, English or both, and leave a trail of every word.
            </p>
          </div>
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
