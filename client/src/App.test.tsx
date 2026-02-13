import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from './App'

function mockListResponse(documents: Record<string, unknown>[] = []) {
  return {
    documents,
    total: documents.length,
    page: 1,
    per_page: 20,
  }
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('Upload tab', () => {
  it('renders the upload form', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(mockListResponse())))
    render(<App />)
    expect(screen.getByText('Upload Document')).toBeInTheDocument()
    expect(screen.getByText('Select a PDF or image')).toBeInTheDocument()
  })

  it('upload submit button is disabled without a file', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(mockListResponse())))
    render(<App />)
    const formBtn = screen.getAllByRole('button').find(b => b.getAttribute('type') === 'submit')!
    expect(formBtn).toBeDisabled()
  })
})

describe('Documents tab', () => {
  it('shows empty state when no documents', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(mockListResponse())))

    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Documents' }))

    await waitFor(() => {
      expect(screen.getByText('No documents found.')).toBeInTheDocument()
    })
  })

  it('renders documents in a table', async () => {
    const docs = [
      {
        id: '1',
        filename: 'passport.pdf',
        disk_filename: 'abc.pdf',
        content_type: 'application/pdf',
        file_size: 2048,
        status: 'pending',
        uploaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(mockListResponse(docs))))

    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Documents' }))

    await waitFor(() => {
      expect(screen.getByText('passport.pdf')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Verify' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument()
  })

  it('calls API when verify is clicked', async () => {
    const docs = [
      {
        id: 'doc-1',
        filename: 'id.pdf',
        disk_filename: 'abc.pdf',
        content_type: 'application/pdf',
        file_size: 1024,
        status: 'pending',
        uploaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]
    const updatedDoc = { ...docs[0], status: 'verified' }
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify(mockListResponse(docs))))
      .mockResolvedValueOnce(new Response(JSON.stringify(updatedDoc)))

    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Documents' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Verify' })).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: 'Verify' }))

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/documents/doc-1',
        expect.objectContaining({ method: 'PATCH' }),
      )
    })
  })

  it('opens rejection modal when reject is clicked', async () => {
    const docs = [
      {
        id: 'doc-2',
        filename: 'bill.pdf',
        disk_filename: 'def.pdf',
        content_type: 'application/pdf',
        file_size: 512,
        status: 'pending',
        uploaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(mockListResponse(docs))))

    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Documents' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: 'Reject' }))

    await waitFor(() => {
      expect(screen.getByText('Reject Document')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Explain why this document is being rejected...')).toBeInTheDocument()
    })
  })

  it('shows filter controls', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(mockListResponse())))

    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Documents' }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search by filename...')).toBeInTheDocument()
    })
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })
})
