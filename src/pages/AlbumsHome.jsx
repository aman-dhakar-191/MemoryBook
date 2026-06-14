import { useState, useEffect } from 'react'
import { getAlbums, createAlbum } from '../firebase/firestore'
import AlbumCard from '../components/AlbumCard'

export default function AlbumsHome({ onOpen }) {
  const [albums, setAlbums] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  useEffect(() => {
    getAlbums().then(setAlbums).finally(() => setLoading(false))
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!newTitle.trim()) return
    const album = await createAlbum(newTitle.trim())
    setAlbums(prev => [album, ...prev])
    setNewTitle('')
    setCreating(false)
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f5f0eb 0%, #ede4d6 100%)' }}>
      <header className="bg-white/80 backdrop-blur border-b border-amber-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1
              className="text-4xl font-bold text-gray-800"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              MemoryBook
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">Your photo albums</p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow"
          >
            + New Album
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {loading ? (
          <p className="text-center text-gray-400 py-24">Loading…</p>
        ) : albums.length === 0 ? (
          <div className="text-center py-28">
            <div className="text-7xl mb-4">📚</div>
            <p className="text-gray-500 text-lg font-medium">No albums yet</p>
            <p className="text-gray-400 text-sm mt-1">Click “New Album” to create your first memory book.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8">
            {albums.map(a => (
              <AlbumCard key={a.id} album={a} onClick={() => onOpen(a)} />
            ))}
          </div>
        )}
      </main>

      {creating && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setCreating(false)}
        >
          <div
            className="bg-white rounded-2xl p-7 w-full max-w-sm shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h2
              className="text-xl font-semibold text-gray-800 mb-5"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              New Album
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                autoFocus
                type="text"
                placeholder="Album title…"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              />
              <button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-xl font-medium transition-colors"
              >
                Create
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
