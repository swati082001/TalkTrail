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
    <div className="overflow-hidden rounded-lg border">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">ID</TableHead>
            <TableHead>Text</TableHead>
            <TableHead className="hidden w-44 sm:table-cell">Created</TableHead>
            <TableHead className="w-24 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className={cn(loading && items.length > 0 && 'opacity-60 transition-opacity')}>
          {showSkeleton &&
            Array.from({ length: SKELETON_ROWS }, (_, i) => (
              <TableRow key={`skeleton-${i}`}>
                <TableCell>
                  <Skeleton className="h-4 w-6" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="mt-2 h-4 w-2/3" />
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Skeleton className="h-4 w-28" />
                </TableCell>
                <TableCell>
                  <Skeleton className="ml-auto h-6 w-14" />
                </TableCell>
              </TableRow>
            ))}

          {!showSkeleton && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                {emptyMessage}
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
