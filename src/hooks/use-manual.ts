// hooks/use-manuals.ts
import { useState } from 'react'

export function useManualUpload() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(payload: {
    file: File
    title: string
    description?: string
    type: 'user_manual' | 'service_manual'
    isPublic?: boolean
  }) {
    setUploading(true)
    setError(null)

    const form = new FormData()
    form.append('file', payload.file)
    form.append('title', payload.title)
    form.append('description', payload.description ?? '')
    form.append('type', payload.type)
    form.append('is_public', String(payload.isPublic ?? false))

    const res = await fetch('/api/manuals/upload', { method: 'POST', body: form })
    const data = await res.json()

    setUploading(false)
    if (!res.ok) { setError(data.error); return null }
    return data.manual
  }

  async function getViewUrl(manualId: string): Promise<string | null> {
    const res = await fetch(`/api/manuals/${manualId}/url`)
    if (!res.ok) return null
    const { url } = await res.json()
    return url
  }

  return { upload, getViewUrl, uploading, error }
}