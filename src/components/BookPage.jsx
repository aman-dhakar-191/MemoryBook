export default function BookPage({ page, pageNumber, onEdit, canvasW, canvasH }) {
  return (
    <div
      style={{
        position: 'relative',
        width: canvasW,
        height: canvasH,
        overflow: 'hidden',
        background: page.background || '#fffdf8',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {(page.elements || []).map(el => (
        <div
          key={el.id}
          style={{
            position: 'absolute',
            left: el.x,
            top: el.y,
            width: el.width,
            height: el.height,
            transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
            pointerEvents: 'none',
          }}
        >
          {el.type === 'photo' && (
            <img
              src={el.imageUrl}
              alt=""
              className={`w-full h-full object-cover frame-${el.frame || 'none'}`}
              draggable={false}
            />
          )}
          {el.type === 'text' && (
            <div
              style={{
                fontSize: el.fontSize || 16,
                color: el.color || '#333',
                fontFamily: el.fontFamily || 'Inter, sans-serif',
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                lineHeight: 1.6,
              }}
            >
              {el.content}
            </div>
          )}
        </div>
      ))}

      <div
        style={{
          position: 'absolute',
          bottom: 10,
          width: '100%',
          textAlign: 'center',
          fontSize: 10,
          color: '#ccc',
          letterSpacing: '0.08em',
          pointerEvents: 'none',
        }}
      >
        {pageNumber}
      </div>

      <button
        onClick={onEdit}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: 'rgba(0,0,0,0.12)',
          color: '#555',
          border: 'none',
          borderRadius: 5,
          padding: '3px 8px',
          fontSize: 11,
          cursor: 'pointer',
        }}
      >
        Edit
      </button>
    </div>
  )
}
