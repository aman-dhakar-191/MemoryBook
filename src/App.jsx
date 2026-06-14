import { useState, useEffect } from 'react'
import Header from './components/Header'
import AlbumGrid from './components/AlbumGrid'
import UploadModal from './components/UploadModal'
import MemoryModal from './components/MemoryModal'
import { getMemories } from './firebase/firestore'

export default function App() {
  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    getMemories()
      .then(setMemories)
      .finally(() => setLoading(false))
  }, [])

  function handleAdd(memory) {
    setMemories(prev => [memory, ...prev])
  }

  function handleUpdate(updated) {
    setMemories(prev => prev.map(m => m.id === updated.id ? updated : m))
    setSelected(updated)
  }

  function handleDelete(id) {
    setMemories(prev => prev.filter(m => m.id !== id))
    setSelected(null)
  }

  return (
    <div className="min-h-screen bg-[#faf7f4]">
      <Header onUpload={() => setShowUpload(true)} />
      <main className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-24 text-gray-400">Loading your memories…</div>
        ) : (
          <AlbumGrid memories={memories} onSelect={setSelected} />
        )}
      </main>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onAdd={handleAdd}
        />
      )}

      {selected && (
        <MemoryModal
          memory={selected}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
