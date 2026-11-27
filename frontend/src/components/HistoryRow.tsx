import { Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import type { Transcription } from '@/types'

export interface HistoryRowProps {
  item: Transcription
  onEdit: (item: Transcription) => void
  onDelete: (item: Transcription) => void
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function HistoryRow({ item, onEdit, onDelete }: HistoryRowProps) {
  const created = new Date(item.created_at)
  const edited = item.updated_at !== item.created_at

  return (
    <TableRow>
      <TableCell className="align-top text-muted-foreground tabular-nums">{item.id}</TableCell>
      <TableCell className="max-w-0 align-top whitespace-normal">
        <p className="line-clamp-3 break-words" title={item.text}>
          {item.text}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{item.language ?? 'auto'}</Badge>
          {item.duration_sec !== null && <Badge variant="secondary">{item.duration_sec}s</Badge>}
          {item.session_id === null && <Badge variant="secondary">manual</Badge>}
          {edited && <Badge variant="secondary">edited</Badge>}
        </div>
      </TableCell>
      <TableCell className="hidden align-top text-muted-foreground sm:table-cell">
        <time dateTime={item.created_at}>{dateFormatter.format(created)}</time>
      </TableCell>
      <TableCell className="align-top">
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => onEdit(item)} aria-label={`Edit transcription ${item.id}`}>
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onDelete(item)}
            aria-label={`Delete transcription ${item.id}`}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
