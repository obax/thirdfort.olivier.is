import { useRef, useState } from 'react'

interface DocumentMeta {
  id: string
  filename: string
  content_type: string
  size: number
  status: string
}

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<DocumentMeta | null>(null)
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
        const data: DocumentMeta = JSON.parse(xhr.responseText)
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

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
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
              <dd>{formatBytes(success.size)}</dd>
              <dt className="text-green-600">Status</dt>
              <dd>{success.status}</dd>
            </dl>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
