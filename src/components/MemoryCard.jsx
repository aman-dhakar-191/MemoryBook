export default function MemoryCard({ memory, onClick }) {
  const frameClass = `frame-${memory.frame || 'none'}`

  return (
    <div
      className="group cursor-pointer"
      onClick={() => onClick(memory)}
    >
      <div className="relative overflow-hidden bg-gray-100 rounded-lg aspect-square">
        <img
          src={memory.imageUrl}
          alt={memory.title || 'Memory'}
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${frameClass}`}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
      </div>
      <div className="mt-2 px-1">
        {memory.title && (
          <p className="font-medium text-gray-800 text-sm truncate">{memory.title}</p>
        )}
        {memory.note && (
          <p className="text-gray-400 text-xs truncate mt-0.5">{memory.note}</p>
        )}
        {memory.createdAt && (
          <p className="text-gray-300 text-xs mt-1">
            {memory.createdAt.toDate?.().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
          </p>
        )}
      </div>
    </div>
  )
}
