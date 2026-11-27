import { Copy, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import type { Transcription } from '@/types'

export interface HistoryRowProps {
  item: Transcription
  onEdit: (item: Transcription) => void
  onDelete: (item: Transcription) => void
}

const fullDate = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

function timeAgo(date: Date): string {
  const seconds = Math.round((date.getTime() - Date.now()) / 1000)
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
  }
  return 'just now'
}

export function HistoryRow({ item, onEdit, onDelete }: HistoryRowProps) {
  const created = new Date(item.created_at)
  const edited = item.updated_at !== item.created_at

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(item.text)
      toast.success('Copied to clipboard')
    } catch {
      toast.error('Could not copy to clipboard')
    }
  }

  return (
    <TableRow className="group">
      <TableCell className="max-w-0 py-3 pl-4 align-top whitespace-normal">
        <p className="line-clamp-3 break-words leading-relaxed" title={item.text}>
          {item.text}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-mono">#{item.id}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={item.created_at} title={fullDate.format(created)}>
            {timeAgo(created)}
          </time>
          {item.duration_sec !== null && (
            <Badge variant="secondary" className="ml-1">
              {item.duration_sec}s
            </Badge>
          )}
          <Badge variant="outline">{item.session_id === null ? 'manual' : 'voice'}</Badge>
          {item.language && <Badge variant="outline">{item.language}</Badge>}
          {edited && <Badge variant="outline">edited</Badge>}
        </div>
      </TableCell>
      <TableCell className="w-32 py-3 pr-3 align-top">
        <div className="flex justify-end gap-0.5 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
          <Button variant="ghost" size="icon-sm" onClick={handleCopy} aria-label={`Copy transcription ${item.id}`}>
            <Copy />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => onEdit(item)} aria-label={`Edit transcription ${item.id}`}>
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onDelete(item)}
            aria-label={`Delete transcription ${item.id}`}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
