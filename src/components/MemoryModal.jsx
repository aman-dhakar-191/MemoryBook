import { useState } from 'react'
import FramePicker from './FramePicker'
import { updateMemory, deleteMemory } from '../firebase/firestore'
import { deletePhoto } from '../firebase/storage'

export default function MemoryModal({ memory, onClose, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(memory.title || '')
  const [note, setNote] = useState(memory.note || '')
  const [frame, setFrame] = useState(memory.frame || 'none')
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const frameClass = `frame-${frame}`

  async function handleSave() {
    setSaving(true)
    try {
      await updateMemory(memory.id, { title, note, frame })
      onUpdate({ ...memory, title, note, frame })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setSaving(true)
    try {
      await deleteMemory(memory.id)
      await deletePhoto(memory.storagePath)
      onDelete(memory.id)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative bg-gray-100">
          <img
            src={memory.imageUrl}
            alt={memory.title || 'Memory'}
            className={`w-full max-h-80 object-contain ${frameClass}`}
          />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          {editing ? (
            <>
              <input
                type="text"
                placeholder="Title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full text-xl font-semibold text-gray-800 border-b border-gray-200 pb-1 focus:outline-none focus:border-rose-400"
              />
              <textarea
                placeholder="Add a note..."
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
                className="w-full text-gray-600 text-sm resize-none border border-gray-200 rounded-lg p-3 focus:outline-none focus:border-rose-400"
              />
              <FramePicker value={frame} onChange={setFrame} />
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              {memory.title && <h2 className="text-xl font-semibold text-gray-800">{memory.title}</h2>}
              {memory.note && <p className="text-gray-600 text-sm leading-relaxed">{memory.note}</p>}
              {memory.createdAt && (
                <p className="text-gray-400 text-xs">
                  {memory.createdAt.toDate?.().toLocaleDateString('en-US', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                  })}
                </p>
              )}
              {memory.frame && memory.frame !== 'none' && (
                <span className="inline-block bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full capitalize">
                  {memory.frame} frame
                </span>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setEditing(true)}
                  className="flex-1 border border-rose-200 text-rose-500 py-2 rounded-lg font-medium hover:bg-rose-50 transition-colors"
                >
                  Edit
                </button>
                {confirming ? (
                  <>
                    <button
                      onClick={handleDelete}
                      disabled={saving}
                      className="flex-1 bg-red-500 text-white py-2 rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Deleting…' : 'Confirm Delete'}
                    </button>
                    <button
                      onClick={() => setConfirming(false)}
                      className="px-4 border border-gray-200 text-gray-500 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      No
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirming(true)}
                    className="px-4 border border-red-200 text-red-400 py-2 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
