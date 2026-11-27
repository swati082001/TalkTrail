import { useCallback, useEffect, useState } from 'react'
import { api, errorMessage } from '@/lib/api'
import type { Transcription } from '@/types'

export interface UseTranscriptionsResult {
  items: Transcription[]
  total: number
  page: number
  totalPages: number
  query: string
  loading: boolean
  error: string | null
  setPage: (page: number) => void
  setQuery: (query: string) => void
  refresh: () => void
  create: (text: string) => Promise<Transcription>
  update: (id: number, text: string) => Promise<Transcription>
  remove: (id: number) => Promise<void>
}

interface LoadResult {
  key: string
  items: Transcription[]
  total: number
  error: string | null
}

export function useTranscriptions(pageSize = 10): UseTranscriptionsResult {
  const [page, setPageState] = useState(1)
  const [query, setQueryState] = useState('')
  const [reloadToken, setReloadToken] = useState(0)
  const [result, setResult] = useState<LoadResult | null>(null)

  const requestKey = `${page}|${query}|${pageSize}|${reloadToken}`

  useEffect(() => {
    const controller = new AbortController()
    api
      .list({ limit: pageSize, offset: (page - 1) * pageSize, q: query || undefined }, controller.signal)
      .then((data) => setResult({ key: requestKey, items: data.items, total: data.total, error: null }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setResult((prev) => ({
          key: requestKey,
          items: prev?.items ?? [],
          total: prev?.total ?? 0,
          error: errorMessage(err),
        }))
      })
    return () => controller.abort()
  }, [page, query, pageSize, requestKey])

  const items = result?.items ?? []
  const total = result?.total ?? 0
  const loading = result?.key !== requestKey
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const refresh = useCallback(() => setReloadToken((t) => t + 1), [])

  const setPage = useCallback((next: number) => setPageState(Math.max(1, next)), [])

  const setQuery = useCallback((next: string) => {
    setQueryState(next)
    setPageState(1)
  }, [])

  const create = useCallback(
    async (text: string) => {
      const created = await api.create({ text })
      setPageState(1)
      refresh()
      return created
    },
    [refresh],
  )

  const update = useCallback(async (id: number, text: string) => {
    const updated = await api.update(id, { text })
    setResult((prev) =>
      prev ? { ...prev, items: prev.items.map((item) => (item.id === id ? updated : item)) } : prev,
    )
    return updated
  }, [])

  const remove = useCallback(
    async (id: number) => {
      await api.remove(id)
      if (items.length === 1 && page > 1) setPageState(page - 1)
      else refresh()
    },
    [items.length, page, refresh],
  )

  return {
    items,
    total,
    page,
    totalPages,
    query,
    loading,
    error: result?.key === requestKey ? result.error : null,
    setPage,
    setQuery,
    refresh,
    create,
    update,
    remove,
  }
}
