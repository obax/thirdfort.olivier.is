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

function Logo() {
  return (
    <svg width="185" height="28" viewBox="0 0 185 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="New Thirdforter">
      <circle cx="14" cy="14" r="14" fill="#1c70ed" />
      <text x="36" y="20" fontFamily="Red Hat Text, sans-serif" fontSize="18" fontWeight="600" fill="#313131">
        new thirdforter
      </text>
    </svg>
  )
}

type Tab = 'upload' | 'documents'

function App() {
  const [tab, setTab] = useState<Tab>('upload')

  return (
    <div className="min-h-screen bg-surface font-sans text-body text-sm">
      <nav className="bg-surface">
        <div className="max-w-4xl mx-auto flex items-center gap-8 px-4 py-5" style={{ minHeight: '82px' }}>
          <Logo />
          <div className="flex gap-1 ml-auto">
            <button
              onClick={() => setTab('upload')}
              className={`px-4 py-2 text-base font-semibold transition-colors ${
                tab === 'upload'
                  ? 'bg-primary text-white'
                  : 'text-body hover:text-heading'
              }`}
            >
              Upload
            </button>
            <button
              onClick={() => setTab('documents')}
              className={`px-4 py-2 text-base font-semibold transition-colors ${
                tab === 'documents'
                  ? 'bg-primary text-white'
                  : 'text-body hover:text-heading'
              }`}
            >
              Documents
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
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
  const [dragActive, setDragActive] = useState(false)
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

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      setFile(droppedFile)
      setError(null)
      setSuccess(null)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="rounded-md bg-white shadow-sm p-8">
        <h1 className="font-sans text-2xl font-semibold text-heading mb-6">Upload Document</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="file" className="block text-sm font-medium text-body mb-2">
              Select a PDF or image
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-md p-8 cursor-pointer transition-colors ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-tf-sage-dark hover:border-primary/50'
              }`}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-tf-sage-dark">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="text-sm text-body">Drag and drop or click to browse</span>
              <span className="text-xs text-tf-sage-dark">PDF, JPG, or PNG</span>
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
                className="hidden"
              />
            </div>
            {file && (
              <p className="mt-2 text-sm text-body">{file.name} ({formatBytes(file.size)})</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!file || uploading}
            className="w-full bg-primary px-7 py-4 text-base font-semibold text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </form>

        {uploading && (
          <div className="mt-4">
            <div className="h-2 bg-tf-sage-dark/30 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-sm text-body text-right">{progress}%</p>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-tf-sage-dark/30 border-t-primary" />
      </div>
    )
  }

  return (
    <div className="rounded-md bg-white shadow-sm p-8">
      <h1 className="font-sans text-2xl font-semibold text-heading mb-4">Documents</h1>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {documents.length === 0 ? (
        <p className="text-body text-sm">No documents uploaded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-tf-sage-dark/30">
          <table className="min-w-full text-sm">
            <thead className="bg-surface text-left text-xs font-semibold text-body uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Filename</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tf-sage-dark/20">
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td className="px-4 py-3 font-medium text-heading whitespace-nowrap">{doc.filename}</td>
                  <td className="px-4 py-3 text-body whitespace-nowrap">{doc.content_type}</td>
                  <td className="px-4 py-3 text-body whitespace-nowrap">{formatBytes(doc.file_size)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge[doc.status] ?? 'bg-gray-100 text-gray-800'}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-body whitespace-nowrap">{relativeTime(doc.uploaded_at)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {doc.status === 'pending' && (
                      <span className="flex gap-2">
                        <button
                          disabled={patchingId === doc.id}
                          onClick={() => updateStatus(doc.id, 'verified')}
                          className="bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          Verify
                        </button>
                        <button
                          disabled={patchingId === doc.id}
                          onClick={() => updateStatus(doc.id, 'rejected')}
                          className="bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
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
