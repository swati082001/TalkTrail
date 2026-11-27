import { useState } from 'react'
import type { FormEvent } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export interface AddTranscriptionFormProps {
  onCreate: (text: string) => Promise<void>
}

const MAX_LENGTH = 10_000

export function AddTranscriptionForm({ onCreate }: AddTranscriptionFormProps) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const trimmed = text.trim()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!trimmed || submitting) return
    setSubmitting(true)
    try {
      await onCreate(trimmed)
      setText('')
      setOpen(false)
    } catch {
      return
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && setOpen(next)}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          New entry
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>New transcription</DialogTitle>
            <DialogDescription>Type or paste text to save it to your history.</DialogDescription>
          </DialogHeader>
          <Label htmlFor="new-transcription" className="sr-only">
            Transcript text
          </Label>
          <Textarea
            id="new-transcription"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Kal meeting hai at 5 pm, please send the report."
            maxLength={MAX_LENGTH}
            rows={5}
            autoFocus
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={submitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!trimmed || submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
