import MemoryCard from './MemoryCard'

export default function AlbumGrid({ memories, onSelect }) {
  if (memories.length === 0) {
    return (
      <div className="text-center py-24">
        <div className="text-6xl mb-4">📷</div>
        <h2 className="text-xl font-semibold text-gray-600 mb-1">No memories yet</h2>
        <p className="text-gray-400 text-sm">Click “Add Memory” to get started.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {memories.map(m => (
        <MemoryCard key={m.id} memory={m} onClick={onSelect} />
      ))}
    </div>
  )
}
