import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { AddTranscriptionForm } from '@/components/AddTranscriptionForm'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EditModal } from '@/components/EditModal'
import { Header } from '@/components/Header'
import { HistoryList } from '@/components/HistoryList'
import { LiveTranscript } from '@/components/LiveTranscript'
import { Pagination } from '@/components/Pagination'
import { Recorder } from '@/components/Recorder'
import { SearchBar } from '@/components/SearchBar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Toaster } from '@/components/ui/sonner'
import { useTranscriber } from '@/hooks/useTranscriber'
import { useTranscriptions } from '@/hooks/useTranscriptions'
import { errorMessage } from '@/lib/api'
import type { Transcription } from '@/types'

function App() {
  const history = useTranscriptions(10)
  const { refresh, create, update, remove } = history
  const transcriber = useTranscriber({ onFinal: refresh })

  const [editing, setEditing] = useState<Transcription | null>(null)
  const [deleting, setDeleting] = useState<Transcription | null>(null)

  const handleCreate = useCallback(
    async (text: string) => {
      try {
        await create(text)
        toast.success('Transcription saved')
      } catch (err: unknown) {
        toast.error(errorMessage(err))
        throw err
      }
    },
    [create],
  )

  const handleSave = useCallback(
    async (id: number, text: string) => {
      try {
        await update(id, text)
        toast.success('Transcription updated')
      } catch (err: unknown) {
        toast.error(errorMessage(err))
        throw err
      }
    },
    [update],
  )

  const handleDelete = useCallback(async () => {
    if (!deleting) return
    try {
      await remove(deleting.id)
      toast.success('Transcription deleted')
    } catch (err: unknown) {
      toast.error(errorMessage(err))
      throw err
    }
  }, [deleting, remove])

  const emptyMessage = history.query
    ? `No transcriptions match “${history.query}”.`
    : 'No transcriptions yet. Record something or add one manually.'

  return (
    <div className="min-h-svh bg-background">
      <Header />
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 sm:py-8">
        <Recorder
          status={transcriber.status}
          error={transcriber.error}
          onStart={() => void transcriber.start()}
          onStop={transcriber.stop}
        />
        <LiveTranscript segments={transcriber.segments} interim={transcriber.interim} status={transcriber.status} />

        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
            <CardDescription>Every saved transcription, newest first.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <SearchBar value={history.query} onChange={history.setQuery} />
            {history.error && (
              <p role="alert" className="text-sm text-destructive">
                {history.error}
              </p>
            )}
            <HistoryList
              items={history.items}
              loading={history.loading}
              emptyMessage={emptyMessage}
              onEdit={setEditing}
              onDelete={setDeleting}
            />
            <Pagination
              page={history.page}
              totalPages={history.totalPages}
              total={history.total}
              disabled={history.loading}
              onPageChange={history.setPage}
            />
          </CardContent>
        </Card>

        <AddTranscriptionForm onCreate={handleCreate} />
      </main>

      <EditModal item={editing} onClose={() => setEditing(null)} onSave={handleSave} />
      <ConfirmDialog
        open={deleting !== null}
        title={`Delete transcription #${deleting?.id ?? ''}?`}
        description="This permanently removes it from the database. This cannot be undone."
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
      <Toaster richColors position="top-right" />
    </div>
  )
}

export default App
