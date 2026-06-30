import { useState, useCallback } from 'react'
import { Rnd } from 'react-rnd'
import { useDropzone } from 'react-dropzone'
import { v4 as uuid } from 'uuid'
import { updatePage } from '../firebase/firestore'
import { uploadPhoto } from '../firebase/storage'

const PAGE_W = 460
const PAGE_H = 640

const BACKGROUNDS = [
  { color: '#fffdf8', label: 'Cream' },
  { color: '#f8f8ff', label: 'White' },
  { color: '#fef3e8', label: 'Warm' },
  { color: '#eef2ff', label: 'Sky' },
  { color: '#fdf2f8', label: 'Rose' },
  { color: '#f0fdf4', label: 'Mint' },
  { color: '#1e1e2e', label: 'Night' },
]

const FRAMES = ['none', 'classic', 'polaroid', 'vintage', 'rounded', 'gold']
const FONTS = ['Inter', 'Playfair Display', 'Georgia', 'Courier New']

function getImageDimensions(url) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => resolve({ w: 200, h: 200 })
    img.src = url
  })
}

export default function PageEditor({ album, page, onSave, onCancel }) {
  const [elements, setElements] = useState(page.elements || [])
  const [background, setBackground] = useState(page.background || '#fffdf8')
  const [selectedId, setSelectedId] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadCount, setUploadCount] = useState({ done: 0, total: 0 })
  const [saving, setSaving] = useState(false)

  const selected = elements.find(e => e.id === selectedId)

  function updateEl(id, patch) {
    setElements(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e))
  }

  function deleteSelected() {
    setElements(prev => prev.filter(e => e.id !== selectedId))
    setSelectedId(null)
  }

  function move(dir) {
    setElements(prev => {
      const i = prev.findIndex(e => e.id === selectedId)
      if (i < 0) return prev
      const next = [...prev]
      const target = i + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[i], next[target]] = [next[target], next[i]]
      return next
    })
  }

  const onDrop = useCallback(async accepted => {
    if (!accepted.length) return
    setUploading(true)
    setUploadCount({ done: 0, total: accepted.length })
    const newEls = []
    for (let i = 0; i < accepted.length; i++) {
      const { url, path } = await uploadPhoto(accepted[i])
      const { w, h } = await getImageDimensions(url)
      const ratio = w / h
      const maxW = 240, maxH = 220
      let elW = maxW, elH = maxW / ratio
      if (elH > maxH) { elH = maxH; elW = maxH * ratio }
      newEls.push({
        id: uuid(), type: 'photo',
        imageUrl: url, storagePath: path, frame: 'none',
        x: 30 + i * 22, y: 30 + i * 22,
        width: Math.round(elW), height: Math.round(elH), rotation: 0,
      })
      setUploadCount({ done: i + 1, total: accepted.length })
    }
    setElements(prev => [...prev, ...newEls])
    setSelectedId(newEls[newEls.length - 1].id)
    setUploading(false)
  }, [])

  const { getInputProps, open } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    noClick: true,
    maxSize: 20 * 1024 * 1024,
  })

  function addText() {
    const el = {
      id: uuid(), type: 'text',
      content: 'Write here…',
      fontSize: 18, color: '#333', fontFamily: 'Inter',
      x: 60, y: 60, width: 240, height: 80, rotation: 0,
    }
    setElements(prev => [...prev, el])
    setSelectedId(el.id)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updatePage(album.id, page.id, { elements, background })
      onSave({ ...page, elements, background })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#0f0f0f' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        background: '#1a1a1a', borderBottom: '1px solid #2a2a2a',
        flexWrap: 'wrap', flexShrink: 0,
      }}>
        <button onClick={onCancel} style={{ color: '#888', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', marginRight: 4 }}>
          ← Back
        </button>
        <div style={{ width: 1, height: 18, background: '#333' }} />

        <input {...getInputProps()} />
        <button
          onClick={open}
          disabled={uploading}
          style={{ background: '#1d4ed8', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, padding: '5px 10px', cursor: 'pointer', opacity: uploading ? 0.6 : 1 }}
        >
          {uploading ? `Uploading ${uploadCount.done}/${uploadCount.total}…` : '+ Photos'}
        </button>

        <button
          onClick={addText}
          style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, padding: '5px 10px', cursor: 'pointer' }}
        >
          + Text
        </button>

        {/* Background */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ color: '#555', fontSize: 11 }}>BG</span>
          {BACKGROUNDS.map(bg => (
            <button
              key={bg.color}
              title={bg.label}
              onClick={() => setBackground(bg.color)}
              style={{
                width: 18, height: 18, borderRadius: '50%', background: bg.color,
                border: background === bg.color ? '2px solid white' : '2px solid #444',
                transform: background === bg.color ? 'scale(1.3)' : 'scale(1)',
                transition: 'all 0.15s', cursor: 'pointer',
              }}
            />
          ))}
        </div>

        {/* Selected controls */}
        {selected && (
          <>
            <div style={{ width: 1, height: 18, background: '#333' }} />
            {selected.type === 'photo' && (
              <select
                value={selected.frame}
                onChange={e => updateEl(selected.id, { frame: e.target.value })}
                style={{ background: '#252525', color: 'white', border: '1px solid #333', borderRadius: 6, fontSize: 11, padding: '3px 6px' }}
              >
                {FRAMES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            )}
            {selected.type === 'text' && (
              <>
                <select
                  value={selected.fontFamily}
                  onChange={e => updateEl(selected.id, { fontFamily: e.target.value })}
                  style={{ background: '#252525', color: 'white', border: '1px solid #333', borderRadius: 6, fontSize: 11, padding: '3px 6px' }}
                >
                  {FONTS.map(f => <option key={f}>{f}</option>)}
                </select>
                <input
                  type="number" value={selected.fontSize} min={10} max={96}
                  onChange={e => updateEl(selected.id, { fontSize: Number(e.target.value) })}
                  style={{ width: 48, background: '#252525', color: 'white', border: '1px solid #333', borderRadius: 6, fontSize: 11, padding: '3px 5px' }}
                />
                <input
                  type="color" value={selected.color}
                  onChange={e => updateEl(selected.id, { color: e.target.value })}
                  style={{ width: 26, height: 26, border: 'none', cursor: 'pointer', borderRadius: 4 }}
                />
              </>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ color: '#555', fontSize: 11 }}>°</span>
              <input
                type="number" value={selected.rotation || 0} min={-180} max={180}
                onChange={e => updateEl(selected.id, { rotation: Number(e.target.value) })}
                style={{ width: 48, background: '#252525', color: 'white', border: '1px solid #333', borderRadius: 6, fontSize: 11, padding: '3px 5px' }}
              />
            </div>
            <button onClick={() => move(-1)} title="Send back" style={{ color: '#666', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>↓</button>
            <button onClick={() => move(1)} title="Bring forward" style={{ color: '#666', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>↑</button>
            <button onClick={deleteSelected} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>✕</button>
          </>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: 6, fontSize: 13, padding: '5px 16px', fontWeight: 600, cursor: 'pointer', marginLeft: 'auto', opacity: saving ? 0.5 : 1 }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* Canvas */}
      <div
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}
        onClick={() => setSelectedId(null)}
      >
        <div
          style={{
            position: 'relative', width: PAGE_W, height: PAGE_H,
            background, boxShadow: '0 20px 60px rgba(0,0,0,0.6)', flexShrink: 0,
          }}
          onClick={e => e.stopPropagation()}
        >
          {elements.map((el, index) => (
            <Rnd
              key={el.id}
              position={{ x: el.x, y: el.y }}
              size={{ width: el.width, height: el.height }}
              bounds="parent"
              lockAspectRatio={el.type === 'photo'}
              style={{
                zIndex: index + 1,
                outline: selectedId === el.id ? '2px solid #60a5fa' : 'none',
                outlineOffset: 2,
              }}
              onDragStop={(_, d) => updateEl(el.id, { x: d.x, y: d.y })}
              onResizeStop={(_, __, ref, ___, pos) =>
                updateEl(el.id, { width: ref.offsetWidth, height: ref.offsetHeight, x: pos.x, y: pos.y })
              }
              onClick={e => { e.stopPropagation(); setSelectedId(el.id) }}
            >
              <div style={{ width: '100%', height: '100%', transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined }}>
                {el.type === 'photo' && (
                  <img
                    src={el.imageUrl} alt=""
                    className={`frame-${el.frame || 'none'}`}
                    draggable={false}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }}
                  />
                )}
                {el.type === 'text' && (
                  <div
                    contentEditable suppressContentEditableWarning
                    onBlur={e => updateEl(el.id, { content: e.currentTarget.textContent || '' })}
                    style={{
                      fontSize: el.fontSize, color: el.color, fontFamily: el.fontFamily,
                      width: '100%', height: '100%', outline: 'none', cursor: 'text',
                      overflow: 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6,
                    }}
                  >
                    {el.content}
                  </div>
                )}
              </div>
            </Rnd>
          ))}
        </div>
      </div>
    </div>
  )
}
