export default function BookPage({ page, pageNumber, onEdit, canvasW, canvasH }) {
  return (
    <div style={{ position: 'relative', width: canvasW, height: canvasH, overflow: 'hidden', background: page.background || '#fffdf8', fontFamily: 'Inter, sans-serif' }}>
      {(page.elements || []).map(el => (
        <div key={el.id} style={{ position: 'absolute', left: el.x, top: el.y, width: el.width, height: el.height, transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined, pointerEvents: 'none' }}>
          {el.type === 'photo' && (
            <img src={el.imageUrl} alt=""
              className={`frame-${el.frame || 'none'} filter-${el.filter || 'none'}`}
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
          )}
          {el.type === 'placeholder' && (
            <div style={{ width: '100%', height: '100%', border: '1.5px dashed #ddd', background: 'rgba(0,0,0,0.015)' }} />
          )}
          {el.type === 'text' && (
            <div style={{ fontSize: el.fontSize || 16, color: el.color || '#333', fontFamily: el.fontFamily || 'Inter, sans-serif', width: '100%', height: '100%', overflow: 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6 }}>
              {el.content}
            </div>
          )}
        </div>
      ))}
      <div style={{ position: 'absolute', bottom: 10, width: '100%', textAlign: 'center', fontSize: 10, color: '#ccc', letterSpacing: '0.08em', pointerEvents: 'none' }}>
        {pageNumber}
      </div>
      <button onClick={onEdit}
        style={{ position: 'absolute', bottom: 16, right: 12, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: 18, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
        ✏️ Edit
      </button>
    </div>
  )
}
