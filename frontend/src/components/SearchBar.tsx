import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

export interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  delayMs?: number
}

export function SearchBar({ value, onChange, delayMs = 300 }: SearchBarProps) {
  const [text, setText] = useState(value)

  useEffect(() => {
    const next = text.trim()
    if (next === value) return
    const timer = window.setTimeout(() => onChange(next), delayMs)
    return () => window.clearTimeout(timer)
  }, [text, value, onChange, delayMs])

  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search transcripts…"
        aria-label="Search transcripts"
        className="pl-8"
      />
    </div>
  )
}
