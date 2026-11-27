import { useState } from 'react'
import type { FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Transcription } from '@/types'

export interface EditModalProps {
  item: Transcription | null
  onClose: () => void
  onSave: (id: number, text: string) => Promise<void>
}

export function EditModal({ item, onClose, onSave }: EditModalProps) {
  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {item && <EditForm key={item.id} item={item} onClose={onClose} onSave={onSave} />}
      </DialogContent>
    </Dialog>
  )
}

interface EditFormProps {
  item: Transcription
  onClose: () => void
  onSave: (id: number, text: string) => Promise<void>
}

function EditForm({ item, onClose, onSave }: EditFormProps) {
  const [text, setText] = useState(item.text)
  const [saving, setSaving] = useState(false)

  const trimmed = text.trim()
  const unchanged = trimmed === item.text

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!trimmed || unchanged || saving) return
    setSaving(true)
    try {
      await onSave(item.id, trimmed)
      onClose()
    } catch {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Edit transcription #{item.id}</DialogTitle>
        <DialogDescription>Fix any words the transcriber got wrong.</DialogDescription>
      </DialogHeader>
      <Label htmlFor="edit-text" className="sr-only">
        Transcript text
      </Label>
      <Textarea
        id="edit-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        maxLength={10_000}
        autoFocus
      />
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={saving}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={!trimmed || unchanged || saving}>
          {saving && <Loader2 className="animate-spin" />}
          Save changes
        </Button>
      </DialogFooter>
    </form>
  )
}
