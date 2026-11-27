import { Inbox } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { HistoryRow } from '@/components/HistoryRow'
import { cn } from '@/lib/utils'
import type { Transcription } from '@/types'

export interface HistoryListProps {
  items: Transcription[]
  loading: boolean
  emptyMessage: string
  onEdit: (item: Transcription) => void
  onDelete: (item: Transcription) => void
}

const SKELETON_ROWS = 4

export function HistoryList({ items, loading, emptyMessage, onEdit, onDelete }: HistoryListProps) {
  const showSkeleton = loading && items.length === 0

  return (
    <div className="overflow-hidden rounded-xl border bg-background/60">
      <Table className="table-fixed">
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4">Transcript</TableHead>
            <TableHead className="w-32 pr-4 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className={cn('transition-opacity', loading && items.length > 0 && 'opacity-60')}>
          {showSkeleton &&
            Array.from({ length: SKELETON_ROWS }, (_, i) => (
              <TableRow key={`skeleton-${i}`} className="hover:bg-transparent">
                <TableCell className="py-4 pl-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="mt-2 h-4 w-3/5" />
                  <Skeleton className="mt-3 h-3 w-32" />
                </TableCell>
                <TableCell />
              </TableRow>
            ))}

          {!showSkeleton && items.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={2} className="py-14">
                <div className="flex flex-col items-center gap-3 text-center text-sm text-muted-foreground">
                  <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                    <Inbox className="size-5" />
                  </div>
                  <p>{emptyMessage}</p>
                </div>
              </TableCell>
            </TableRow>
          )}

          {items.map((item) => (
            <HistoryRow key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
