import { useCallback, useEffect, useRef, useState } from 'react'

interface Document {
  id: string
  filename: string
  content_type: string
  file_size: number
  status: string
  uploaded_at: string
  updated_at: string
}

function relativeTime(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type Tab = 'upload' | 'documents'

function App() {
  const [tab, setTab] = useState<Tab>('upload')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto flex">
          <button
            onClick={() => setTab('upload')}
            className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'upload'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Upload
          </button>
          <button
            onClick={() => setTab('documents')}
            className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'documents'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Documents
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-4">
        {tab === 'upload' ? <UploadTab /> : <DocumentsTab />}
      </div>
    </div>
  )
}

function UploadTab() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<Document | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return

    setUploading(true)
    setProgress(0)
    setError(null)
    setSuccess(null)

    const formData = new FormData()
    formData.append('file', file)

    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      setUploading(false)
      if (xhr.status === 201) {
        const data: Document = JSON.parse(xhr.responseText)
        setSuccess(data)
        setFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        try {
          const body = JSON.parse(xhr.responseText)
          setError(body.error || `Upload failed (${xhr.status})`)
        } catch {
          setError(`Upload failed (${xhr.status})`)
        }
      }
    })

    xhr.addEventListener('error', () => {
      setUploading(false)
      setError('Network error. Please try again.')
    })

    xhr.open('POST', '/documents')
    xhr.send(formData)
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Upload Document</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
            Select a PDF or image
          </label>
          <input
            ref={fileInputRef}
            id="file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null)
              setError(null)
              setSuccess(null)
            }}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <button
          type="submit"
          disabled={!file || uploading}
          className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>

      {uploading && (
        <div className="mt-4">
          <div className="h-2 rounded bg-gray-200 overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-sm text-gray-500 text-right">{progress}%</p>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 rounded bg-green-50 border border-green-200 p-3 text-sm text-green-800">
          <p className="font-semibold mb-1">Upload successful</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
            <dt className="text-green-600">Filename</dt>
            <dd>{success.filename}</dd>
            <dt className="text-green-600">Type</dt>
            <dd>{success.content_type}</dd>
            <dt className="text-green-600">Size</dt>
            <dd>{formatBytes(success.file_size)}</dd>
            <dt className="text-green-600">Status</dt>
            <dd>{success.status}</dd>
          </dl>
        </div>
      )}
    </div>
  )
}

const statusBadge: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  verified: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

function DocumentsTab() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [patchingId, setPatchingId] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/documents')
      if (!res.ok) throw new Error(`Failed to load documents (${res.status})`)
      const data: Document[] = await res.json()
      setDocuments(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  async function updateStatus(id: string, status: 'verified' | 'rejected') {
    setPatchingId(id)
    setError(null)
    try {
      const res = await fetch(`/documents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error(`Failed to update document (${res.status})`)
      const updated: Document = await res.json()
      setDocuments((prev) => prev.map((d) => (d.id === id ? updated : d)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update document')
    } finally {
      setPatchingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      </div>
    )
  }

  return (
    <div className="mt-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Documents</h1>

      {error && (
        <div className="mb-4 rounded bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {documents.length === 0 ? (
        <p className="text-gray-500 text-sm">No documents uploaded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Filename</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{doc.filename}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{doc.content_type}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatBytes(doc.file_size)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge[doc.status] ?? 'bg-gray-100 text-gray-800'}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{relativeTime(doc.uploaded_at)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {doc.status === 'pending' && (
                      <span className="flex gap-2">
                        <button
                          disabled={patchingId === doc.id}
                          onClick={() => updateStatus(doc.id, 'verified')}
                          className="rounded bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          Verify
                        </button>
                        <button
                          disabled={patchingId === doc.id}
                          onClick={() => updateStatus(doc.id, 'rejected')}
                          className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default App
