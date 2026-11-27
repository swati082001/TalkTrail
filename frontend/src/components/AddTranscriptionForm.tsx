import { useState } from 'react'
import type { FormEvent } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export interface AddTranscriptionFormProps {
  onCreate: (text: string) => Promise<void>
}

const MAX_LENGTH = 10_000

export function AddTranscriptionForm({ onCreate }: AddTranscriptionFormProps) {
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
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add manually</CardTitle>
        <CardDescription>Type or paste a transcript to save it to history.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Label htmlFor="new-transcription" className="sr-only">
            Transcript text
          </Label>
          <Textarea
            id="new-transcription"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Kal meeting hai at 5 pm, please send the report."
            maxLength={MAX_LENGTH}
            rows={3}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={!trimmed || submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : <Plus />}
              Save
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
