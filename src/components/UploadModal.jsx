import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import FramePicker from './FramePicker'
import { uploadPhoto } from '../firebase/storage'
import { addMemory } from '../firebase/firestore'

export default function UploadModal({ onClose, onAdd }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [frame, setFrame] = useState('none')
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const onDrop = useCallback(accepted => {
    const f = accepted[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024,
  })

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) { setError('Please choose a photo.'); return }
    setUploading(true)
    setError('')
    try {
      const { url, path } = await uploadPhoto(file, setProgress)
      const docRef = await addMemory({ title, note, frame, imageUrl: url, storagePath: path })
      onAdd({ id: docRef.id, title, note, frame, imageUrl: url, storagePath: path, createdAt: null })
      onClose()
    } catch (err) {
      setError('Upload failed. Please try again.')
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-gray-800">Add a Memory</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!preview ? (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-rose-400 bg-rose-50' : 'border-gray-200 hover:border-rose-300'
                }`}
              >
                <input {...getInputProps()} />
                <div className="text-4xl mb-2">📷</div>
                <p className="text-gray-500 text-sm">
                  {isDragActive ? 'Drop your photo here' : 'Drag & drop or click to choose a photo'}
                </p>
                <p className="text-gray-300 text-xs mt-1">Max 20MB</p>
              </div>
            ) : (
              <div className="relative">
                <img src={preview} alt="Preview" className={`w-full rounded-xl object-cover max-h-64 frame-${frame}`} />
                <button
                  type="button"
                  onClick={() => { setFile(null); setPreview(null) }}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-black/70"
                >
                  ✕
                </button>
              </div>
            )}

            <input
              type="text"
              placeholder="Title (optional)"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-400"
            />

            <textarea
              placeholder="Add a note..."
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-rose-400"
            />

            <FramePicker value={frame} onChange={setFrame} />

            {error && <p className="text-red-500 text-sm">{error}</p>}

            {uploading && (
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-rose-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={uploading}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {uploading ? `Uploading… ${Math.round(progress)}%` : 'Save Memory'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
