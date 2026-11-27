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
import { Badge } from '@/components/ui/badge'
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
    <div className="min-h-svh">
      <Header />

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
        <section className="flex flex-col gap-2 text-center">
          <h2 className="bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
            Speak naturally. We’ll keep the trail.
          </h2>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Real-time transcription for Hindi, English and Hinglish. Every sentence is saved automatically.
          </p>
        </section>

        <section className="grid gap-6 rounded-3xl border bg-card/70 p-4 shadow-xl shadow-black/5 backdrop-blur-sm sm:p-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-8 dark:shadow-black/30">
          <div className="flex items-center justify-center py-4 lg:py-8">
            <Recorder
              status={transcriber.status}
              error={transcriber.error}
              analyser={transcriber.analyser}
              startedAt={transcriber.startedAt}
              onStart={() => void transcriber.start()}
              onStop={transcriber.stop}
            />
          </div>
          <LiveTranscript
            segments={transcriber.segments}
            interim={transcriber.interim}
            status={transcriber.status}
            onClear={transcriber.clear}
          />
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight">History</h2>
                <Badge variant="secondary" className="tabular-nums">
                  {history.total}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Every saved transcription, newest first.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <SearchBar value={history.query} onChange={history.setQuery} />
              <AddTranscriptionForm onCreate={handleCreate} />
            </div>
          </div>

          {history.error && (
            <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
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

          {history.total > 0 && (
            <Pagination
              page={history.page}
              totalPages={history.totalPages}
              total={history.total}
              disabled={history.loading}
              onPageChange={history.setPage}
            />
          )}
        </section>
      </main>

      <EditModal item={editing} onClose={() => setEditing(null)} onSave={handleSave} />
      <ConfirmDialog
        open={deleting !== null}
        title="Delete this transcription?"
        description="This permanently removes it from the database. This cannot be undone."
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
      <Toaster richColors position="top-right" />
    </div>
  )
}

export default App
