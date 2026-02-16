import { useCallback, useEffect, useRef, useState } from 'react'

interface Document {
  id: string
  filename: string
  disk_filename: string
  content_type: string
  file_size: number
  status: string
  rejection_reason?: string
  uploaded_at: string
  updated_at: string
}

interface ListResult {
  documents: Document[]
  total: number
  page: number
  per_page: number
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
    <div className="min-h-screen flex flex-col bg-surface font-sans text-body text-sm">
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

      <div className="max-w-4xl mx-auto px-4 py-8 flex-1 w-full">
        {tab === 'upload' ? <UploadTab /> : <DocumentsTab />}
      </div>

      <footer className="bg-black text-white mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-base font-semibold">Olivier Bacs</p>
              <p className="text-sm text-gray-400 mt-1">Fullstack Engineering Assessment</p>
            </div>
            <a
              href="https://github.com/obax/thirdfort.olivier.is"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
              View source
            </a>
          </div>
          <div className="border-t border-gray-800 mt-6 pt-4">
            <p className="text-xs text-gray-500">&copy; {new Date().getFullYear()} Olivier Bacs. All rights reserved.</p>
          </div>
        </div>
      </footer>
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

function PreviewModal({ doc, onClose }: { doc: Document; onClose: () => void }) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const fileUrl = `/documents/${doc.id}/file`
  const isPdf = doc.content_type === 'application/pdf'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-md shadow-lg max-w-3xl w-full max-h-[90vh] flex flex-col m-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-tf-sage-dark/20">
          <h2 className="font-semibold text-heading truncate">{doc.filename}</h2>
          <button onClick={onClose} className="text-body hover:text-heading text-lg px-2">&times;</button>
        </div>
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[400px]">
          {isPdf ? (
            <iframe src={fileUrl} className="w-full h-[70vh] border-0" title={doc.filename} />
          ) : (
            <img src={fileUrl} alt={doc.filename} className="max-w-full max-h-[70vh] object-contain" />
          )}
        </div>
      </div>
    </div>
  )
}

function RejectModal({ docId, onClose, onConfirm }: { docId: string; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('')

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-md shadow-lg max-w-md w-full m-4" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-tf-sage-dark/20">
          <h2 className="font-semibold text-heading">Reject Document</h2>
        </div>
        <div className="p-4">
          <label htmlFor={`reject-reason-${docId}`} className="block text-sm font-medium text-body mb-2">
            Reason for rejection
          </label>
          <textarea
            id={`reject-reason-${docId}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border border-tf-sage-dark/30 rounded-md p-2 text-sm resize-none h-24 focus:outline-none focus:border-primary"
            placeholder="Explain why this document is being rejected..."
          />
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-tf-sage-dark/20">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-body hover:text-heading transition-colors">
            Cancel
          </button>
          <button
            disabled={!reason.trim()}
            onClick={() => onConfirm(reason.trim())}
            className="bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}

function DocumentsTab() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage] = useState(20)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [patchingId, setPatchingId] = useState<string | null>(null)
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, debouncedQuery])

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('per_page', String(perPage))
      if (statusFilter) params.set('status', statusFilter)
      if (debouncedQuery) params.set('q', debouncedQuery)

      const res = await fetch(`/documents?${params}`)
      if (!res.ok) throw new Error(`Failed to load documents (${res.status})`)
      const data: ListResult = await res.json()
      setDocuments(data.documents)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [page, perPage, statusFilter, debouncedQuery])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  async function updateStatus(id: string, status: 'verified' | 'rejected', rejectionReason?: string) {
    setPatchingId(id)
    setError(null)
    try {
      const body: Record<string, string> = { status }
      if (rejectionReason) body.rejection_reason = rejectionReason
      const res = await fetch(`/documents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  const totalPages = Math.max(1, Math.ceil(total / perPage))

  return (
    <div className="rounded-md bg-white shadow-sm p-8">
      <h1 className="font-sans text-2xl font-semibold text-heading mb-4">Documents</h1>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-tf-sage-dark/30 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by filename..."
          className="flex-1 border border-tf-sage-dark/30 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-tf-sage-dark/30 border-t-primary" />
        </div>
      ) : documents.length === 0 ? (
        <p className="text-body text-sm">No documents found.</p>
      ) : (
        <>
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
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        className="text-primary hover:underline text-left"
                      >
                        {doc.filename}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-body whitespace-nowrap">{doc.content_type}</td>
                    <td className="px-4 py-3 text-body whitespace-nowrap">{formatBytes(doc.file_size)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge[doc.status] ?? 'bg-gray-100 text-gray-800'}`}
                        title={doc.rejection_reason ?? undefined}
                      >
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
                            onClick={() => setRejectingId(doc.id)}
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

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-body">
              {total} document{total !== 1 ? 's' : ''} total
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 text-sm border border-tf-sage-dark/30 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-body">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 text-sm border border-tf-sage-dark/30 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {previewDoc && <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />}

      {rejectingId && (
        <RejectModal
          docId={rejectingId}
          onClose={() => setRejectingId(null)}
          onConfirm={(reason) => {
            updateStatus(rejectingId, 'rejected', reason)
            setRejectingId(null)
          }}
        />
      )}
    </div>
  )
}

export default App
