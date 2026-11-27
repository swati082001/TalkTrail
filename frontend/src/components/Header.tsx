import { AudioLines } from 'lucide-react'

export function Header() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4">
        <AudioLines className="size-7 text-primary" aria-hidden="true" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">TalkTrail</h1>
          <p className="text-sm text-muted-foreground">
            Speak in Hindi, English or both, and leave a trail of every word.
          </p>
        </div>
      </div>
    </header>
  )
}
