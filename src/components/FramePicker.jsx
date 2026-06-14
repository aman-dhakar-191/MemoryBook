const FRAMES = [
  { id: 'none', label: 'None' },
  { id: 'classic', label: 'Classic' },
  { id: 'polaroid', label: 'Polaroid' },
  { id: 'vintage', label: 'Vintage' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'gold', label: 'Gold' },
]

export { FRAMES }

export default function FramePicker({ value, onChange }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">Frame Style</p>
      <div className="flex flex-wrap gap-2">
        {FRAMES.map(f => (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
              value === f.id
                ? 'bg-rose-500 text-white border-rose-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-rose-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  )
}
