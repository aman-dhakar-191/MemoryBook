export default function AlbumCard({ album, onClick }) {
  return (
    <button onClick={onClick} className="group text-left w-full">
      <div className="relative">
        {/* Stacked page effect */}
        <div className="absolute inset-0 translate-x-2 translate-y-2 rounded-r-xl" style={{ background: '#d4b896' }} />
        <div className="absolute inset-0 translate-x-1 translate-y-1 rounded-r-xl" style={{ background: '#e8cfa8' }} />

        {/* Front cover */}
        <div
          className="relative rounded-r-xl overflow-hidden aspect-[3/4] transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-2xl shadow-lg"
          style={{ background: '#7c3a1e' }}
        >
          {/* Spine */}
          <div
            className="absolute left-0 top-0 bottom-0 w-3"
            style={{ background: 'rgba(0,0,0,0.35)' }}
          />

          {album.coverUrl ? (
            <img
              src={album.coverUrl}
              alt={album.title}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ left: 12, width: 'calc(100% - 12px)' }}
            />
          ) : (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center"
              style={{ left: 12, width: 'calc(100% - 12px)' }}
            >
              <div className="text-5xl mb-3 opacity-40">📷</div>
              <div className="w-10 h-px mb-1.5" style={{ background: 'rgba(255,230,180,0.3)' }} />
              <div className="w-7 h-px" style={{ background: 'rgba(255,230,180,0.3)' }} />
            </div>
          )}

          {/* Title at bottom */}
          <div
            className="absolute bottom-0 left-3 right-0 px-3 py-3"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)' }}
          >
            <p
              className="text-white text-sm font-semibold truncate"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              {album.title}
            </p>
          </div>
        </div>
      </div>
    </button>
  )
}
