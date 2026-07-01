import { useState, useCallback, useRef } from 'react'
import { Rnd } from 'react-rnd'
import { useDropzone } from 'react-dropzone'
import { v4 as uuid } from 'uuid'
import { updatePage } from '../firebase/firestore'
import { uploadPhoto } from '../firebase/storage'

const PAGE_W = 460
const PAGE_H = 640
const G = 10
const CH = PAGE_H - 50

const hw = Math.floor((PAGE_W - G * 3) / 2)
const hh = Math.floor((CH - G * 3) / 2)
const tw = Math.floor((PAGE_W - G * 4) / 3)
const th = Math.floor((CH - G * 4) / 3)

const LAYOUTS = [
  {
    id: 'full', label: 'Full',
    slots: [{ x: G, y: G, w: PAGE_W - G * 2, h: CH - G * 2 }],
  },
  {
    id: 'side-by-side', label: 'Side by Side',
    slots: [
      { x: G, y: G, w: hw, h: CH - G * 2 },
      { x: G * 2 + hw, y: G, w: hw, h: CH - G * 2 },
    ],
  },
  {
    id: 'top-bottom', label: 'Top & Bottom',
    slots: [
      { x: G, y: G, w: PAGE_W - G * 2, h: hh },
      { x: G, y: G * 2 + hh, w: PAGE_W - G * 2, h: hh },
    ],
  },
  {
    id: 'featured-top', label: 'Featured Top',
    slots: [
      { x: G, y: G, w: PAGE_W - G * 2, h: Math.floor((CH - G * 3) * 0.58) },
      { x: G, y: G * 2 + Math.floor((CH - G * 3) * 0.58), w: hw, h: Math.floor((CH - G * 3) * 0.42) },
      { x: G * 2 + hw, y: G * 2 + Math.floor((CH - G * 3) * 0.58), w: hw, h: Math.floor((CH - G * 3) * 0.42) },
    ],
  },
  {
    id: 'featured-left', label: 'Featured Left',
    slots: [
      { x: G, y: G, w: Math.floor((PAGE_W - G * 3) * 0.6), h: CH - G * 2 },
      { x: G * 2 + Math.floor((PAGE_W - G * 3) * 0.6), y: G, w: Math.floor((PAGE_W - G * 3) * 0.4), h: hh },
      { x: G * 2 + Math.floor((PAGE_W - G * 3) * 0.6), y: G * 2 + hh, w: Math.floor((PAGE_W - G * 3) * 0.4), h: hh },
    ],
  },
  {
    id: 'grid', label: 'Grid 2×2',
    slots: [
      { x: G, y: G, w: hw, h: hh },
      { x: G * 2 + hw, y: G, w: hw, h: hh },
      { x: G, y: G * 2 + hh, w: hw, h: hh },
      { x: G * 2 + hw, y: G * 2 + hh, w: hw, h: hh },
    ],
  },
  {
    id: 'three-col', label: '3 Cols',
    slots: [
      { x: G, y: G, w: tw, h: CH - G * 2 },
      { x: G * 2 + tw, y: G, w: tw, h: CH - G * 2 },
      { x: G * 3 + tw * 2, y: G, w: tw, h: CH - G * 2 },
    ],
  },
  {
    id: 'three-row', label: '3 Rows',
    slots: [
      { x: G, y: G, w: PAGE_W - G * 2, h: th },
      { x: G, y: G * 2 + th, w: PAGE_W - G * 2, h: th },
      { x: G, y: G * 3 + th * 2, w: PAGE_W - G * 2, h: th },
    ],
  },
]

const BACKGROUNDS = [
  { color: '#fffdf8', label: 'Cream' },
  { color: '#f8f8ff', label: 'White' },
  { color: '#fef3e8', label: 'Warm' },
  { color: '#eef2ff', label: 'Sky' },
  { color: '#fdf2f8', label: 'Rose' },
  { color: '#f0fdf4', label: 'Mint' },
  { color: '#1e1e2e', label: 'Night' },
]

const FRAMES = ['none', 'classic', 'polaroid', 'vintage', 'rounded', 'gold', 'shadow', 'thin', 'film', 'double']

const FILTERS = [
  { id: 'none',     label: 'Normal'   },
  { id: 'bw',      label: 'B&W'      },
  { id: 'sepia',   label: 'Sepia'    },
  { id: 'warm',    label: 'Warm'     },
  { id: 'cool',    label: 'Cool'     },
  { id: 'faded',   label: 'Faded'    },
  { id: 'vivid',   label: 'Vivid'    },
  { id: 'dramatic',label: 'Dramatic' },
]

const FONTS = ['Inter', 'Playfair Display', 'Georgia', 'Courier New']

const STICKERS = [
  '😀','😂','🥹','😍','🥰','😎','🤩','🥳','😭','😱','😜','😘',
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','💕','💗','🫶','💝',
  '🌸','🌺','🌻','🌹','🌼','🍀','🌿','🌙','⭐','🌈','☀️','❄️',
  '🎉','🎊','🎁','🎈','🎀','🏆','✨','🔥','💫','🎵','🎶','🎂',
  '🐱','🐶','🦊','🐻','🐼','🦁','🦋','🦄','🐸','🐧','🐨','🐯',
  '✈️','🚀','🏖️','🏔️','🌊','🌴','🍕','🍦','🥂','🎆','🎭','🌍',
]

function getImageDimensions(url) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => resolve({ w: 200, h: 200 })
    img.src = url
  })
}

function LayoutPreview({ slots }) {
  const sx = 68 / PAGE_W, sy = 52 / PAGE_H
  return (
    <svg width={68} height={52} style={{ display: 'block' }}>
      <rect width={68} height={52} fill="#242424" rx={3} />
      {slots.map((s, i) => (
        <rect key={i} x={s.x * sx} y={s.y * sy} width={s.w * sx} height={s.h * sy} fill="#5a5a5a" rx={1.5} />
      ))}
    </svg>
  )
}

export default function PageEditor({ album, page, onSave, onCancel }) {
  const [elements, setElements] = useState(page.elements || [])
  const [background, setBackground] = useState(page.background || '#fffdf8')
  const [selectedId, setSelectedId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadCount, setUploadCount] = useState({ done: 0, total: 0 })
  const [saving, setSaving] = useState(false)
  const [showLayouts, setShowLayouts] = useState(false)
  const [showStickers, setShowStickers] = useState(false)
  const placeholderInputRef = useRef(null)
  const placeholderTarget = useRef(null)

  const selected = elements.find(e => e.id === selectedId)

  function updateEl(id, patch) {
    setElements(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e))
  }
  function deleteSelected() {
    setElements(prev => prev.filter(e => e.id !== selectedId))
    setSelectedId(null)
    setEditingId(null)
  }
  function move(dir) {
    setElements(prev => {
      const i = prev.findIndex(e => e.id === selectedId)
      if (i < 0) return prev
      const next = [...prev]
      const t = i + dir
      if (t < 0 || t >= next.length) return prev
      ;[next[i], next[t]] = [next[t], next[i]]
      return next
    })
  }

  function applyLayout(layout) {
    const photos = elements.filter(e => e.type === 'photo')
    const texts = elements.filter(e => e.type === 'text' || e.type === 'emoji')
    const newEls = layout.slots.map((s, i) =>
      i < photos.length
        ? { ...photos[i], x: s.x, y: s.y, width: s.w, height: s.h }
        : { id: uuid(), type: 'placeholder', x: s.x, y: s.y, width: s.w, height: s.h, rotation: 0 }
    )
    setElements([...texts, ...newEls])
    setSelectedId(null)
    setEditingId(null)
    setShowLayouts(false)
  }

  async function handlePlaceholderFile(e) {
    const file = e.target.files[0]
    if (!file || !placeholderTarget.current) return
    const id = placeholderTarget.current
    e.target.value = ''
    setUploading(true)
    try {
      const { url, path } = await uploadPhoto(file, null, `memorybook/${album.id}`)
      setElements(prev => prev.map(el =>
        el.id === id ? { ...el, type: 'photo', imageUrl: url, storagePath: path, frame: 'none', filter: 'none' } : el
      ))
    } finally {
      setUploading(false)
      placeholderTarget.current = null
    }
  }

  const onDrop = useCallback(async accepted => {
    if (!accepted.length) return
    setUploading(true)
    setUploadCount({ done: 0, total: accepted.length })
    const newEls = []
    for (let i = 0; i < accepted.length; i++) {
      const { url, path } = await uploadPhoto(accepted[i], null, `memorybook/${album.id}`)
      const { w, h } = await getImageDimensions(url)
      const ratio = w / h
      const maxW = 240, maxH = 220
      let elW = maxW, elH = maxW / ratio
      if (elH > maxH) { elH = maxH; elW = maxH * ratio }
      newEls.push({
        id: uuid(), type: 'photo', imageUrl: url, storagePath: path, frame: 'none', filter: 'none',
        x: 30 + i * 22, y: 30 + i * 22,
        width: Math.round(elW), height: Math.round(elH), rotation: 0,
      })
      setUploadCount({ done: i + 1, total: accepted.length })
    }
    setElements(prev => [...prev, ...newEls])
    setSelectedId(newEls[newEls.length - 1]?.id ?? null)
    setUploading(false)
  }, [album.id])

  const { getInputProps, open } = useDropzone({ onDrop, accept: { 'image/*': [] }, noClick: true, maxSize: 20 * 1024 * 1024 })

  function addText() {
    const el = { id: uuid(), type: 'text', content: '', fontSize: 18, color: '#333', fontFamily: 'Inter', x: 60, y: 60, width: 240, height: 80, rotation: 0 }
    setElements(prev => [...prev, el])
    setSelectedId(el.id)
    setEditingId(el.id)
  }

  function addEmoji(emoji) {
    const el = { id: uuid(), type: 'emoji', content: emoji, x: 160, y: 220, width: 80, height: 80, rotation: 0 }
    setElements(prev => [...prev, el])
    setSelectedId(el.id)
    setShowStickers(false)
  }

  async function handleSave() {
    setSaving(true)
    setEditingId(null)
    try {
      await updatePage(album.id, page.id, { elements, background })
      onSave({ ...page, elements, background })
    } finally { setSaving(false) }
  }

  const btn = (style = {}) => ({
    border: 'none', borderRadius: 6, fontSize: 12, padding: '5px 10px', cursor: 'pointer', ...style,
  })

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#0f0f0f' }}>
      <input {...getInputProps()} />
      <input ref={placeholderInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePlaceholderFile} />

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#1a1a1a', borderBottom: '1px solid #2a2a2a', flexWrap: 'wrap', flexShrink: 0 }}>
        <button onClick={onCancel} style={{ color: '#888', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', marginRight: 4 }}>← Back</button>
        <div style={{ width: 1, height: 18, background: '#333' }} />

        <button onClick={open} disabled={uploading} style={btn({ background: '#1d4ed8', color: 'white', opacity: uploading ? 0.6 : 1 })}>
          {uploading ? `Uploading ${uploadCount.done}/${uploadCount.total}…` : '+ Photos'}
        </button>
        <button onClick={addText} style={btn({ background: '#7c3aed', color: 'white' })}>+ Text</button>

        {/* Sticker picker */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => { setShowStickers(v => !v); setShowLayouts(false) }} style={btn({ background: '#b45309', color: 'white' })}>😊 Sticker</button>
          {showStickers && (
            <div
              style={{ position: 'absolute', top: '110%', left: 0, zIndex: 100, background: '#1a1a1a', border: '1px solid #333', borderRadius: 10, padding: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.6)', width: 252 }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 2, maxHeight: 220, overflowY: 'auto' }}>
                {STICKERS.map((emoji, i) => (
                  <button key={i} onClick={() => addEmoji(emoji)}
                    style={{ background: 'none', border: 'none', fontSize: 26, cursor: 'pointer', padding: '4px 2px', borderRadius: 6, lineHeight: 1 }}
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Layout picker */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => { setShowLayouts(v => !v); setShowStickers(false) }} style={btn({ background: '#0f766e', color: 'white' })}>⋎ Layout</button>
          {showLayouts && (
            <div
              style={{ position: 'absolute', top: '110%', left: 0, zIndex: 100, background: '#1a1a1a', border: '1px solid #333', borderRadius: 10, padding: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.6)', width: 340 }}
              onClick={e => e.stopPropagation()}
            >
              <p style={{ color: '#555', fontSize: 10, marginBottom: 8 }}>Existing photos are rearranged; empty slots become placeholders.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {LAYOUTS.map(l => (
                  <button key={l.id} onClick={() => applyLayout(l)}
                    style={{ background: 'none', border: '1px solid #333', borderRadius: 6, padding: 6, cursor: 'pointer', textAlign: 'center' }}
                  >
                    <LayoutPreview slots={l.slots} />
                    <div style={{ color: '#aaa', fontSize: 9, marginTop: 4, lineHeight: 1.2 }}>{l.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* BG */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: '#555', fontSize: 11 }}>BG</span>
          {BACKGROUNDS.map(bg => (
            <button key={bg.color} title={bg.label} onClick={() => setBackground(bg.color)}
              style={{ width: 17, height: 17, borderRadius: '50%', background: bg.color, border: background === bg.color ? '2px solid white' : '2px solid #444', transform: background === bg.color ? 'scale(1.3)' : 'scale(1)', transition: 'all .15s', cursor: 'pointer' }}
            />
          ))}
        </div>

        {/* Selected element controls */}
        {selected && (
          <>
            <div style={{ width: 1, height: 18, background: '#333' }} />
            {selected.type === 'photo' && (
              <>
                <select value={selected.frame || 'none'} onChange={e => updateEl(selected.id, { frame: e.target.value })}
                  style={{ background: '#252525', color: 'white', border: '1px solid #333', borderRadius: 6, fontSize: 11, padding: '3px 5px' }}>
                  {FRAMES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <select value={selected.filter || 'none'} onChange={e => updateEl(selected.id, { filter: e.target.value })}
                  style={{ background: '#252525', color: 'white', border: '1px solid #333', borderRadius: 6, fontSize: 11, padding: '3px 5px' }}>
                  {FILTERS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </>
            )}
            {selected.type === 'text' && (
              <>
                <select value={selected.fontFamily} onChange={e => updateEl(selected.id, { fontFamily: e.target.value })}
                  style={{ background: '#252525', color: 'white', border: '1px solid #333', borderRadius: 6, fontSize: 11, padding: '3px 5px' }}>
                  {FONTS.map(f => <option key={f}>{f}</option>)}
                </select>
                <input type="number" value={selected.fontSize} min={10} max={96} onChange={e => updateEl(selected.id, { fontSize: +e.target.value })}
                  style={{ width: 46, background: '#252525', color: 'white', border: '1px solid #333', borderRadius: 6, fontSize: 11, padding: '3px 5px' }} />
                <input type="color" value={selected.color} onChange={e => updateEl(selected.id, { color: e.target.value })}
                  style={{ width: 26, height: 26, border: 'none', cursor: 'pointer', borderRadius: 4 }} />
              </>
            )}
            <span style={{ color: '#555', fontSize: 11 }}>°</span>
            <input type="number" value={selected.rotation || 0} min={-180} max={180} onChange={e => updateEl(selected.id, { rotation: +e.target.value })}
              style={{ width: 46, background: '#252525', color: 'white', border: '1px solid #333', borderRadius: 6, fontSize: 11, padding: '3px 5px' }} />
            <button onClick={() => move(-1)} style={{ color: '#666', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>↓</button>
            <button onClick={() => move(1)} style={{ color: '#666', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>↑</button>
            <button onClick={deleteSelected} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>✕</button>
          </>
        )}

        <button onClick={handleSave} disabled={saving}
          style={btn({ background: '#16a34a', color: 'white', fontSize: 13, padding: '5px 16px', fontWeight: 600, marginLeft: 'auto', opacity: saving ? 0.5 : 1 })}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}
        onClick={() => { setSelectedId(null); setEditingId(null); setShowLayouts(false); setShowStickers(false) }}>
        <div style={{ position: 'relative', width: PAGE_W, height: PAGE_H, background, boxShadow: '0 20px 60px rgba(0,0,0,0.6)', flexShrink: 0 }}
          onClick={e => e.stopPropagation()}>
          {elements.map((el, index) => (
            <Rnd key={el.id}
              position={{ x: el.x, y: el.y }}
              size={{ width: el.width, height: el.height }}
              bounds="parent"
              lockAspectRatio={el.type === 'photo'}
              disableDragging={el.type === 'placeholder' || editingId === el.id}
              enableResizing={el.type !== 'placeholder' && editingId !== el.id}
              style={{ zIndex: index + 1, outline: selectedId === el.id ? '2px solid #60a5fa' : 'none', outlineOffset: 2 }}
              onDragStop={(_, d) => updateEl(el.id, { x: d.x, y: d.y })}
              onResizeStop={(_, __, ref, ___, pos) => updateEl(el.id, { width: ref.offsetWidth, height: ref.offsetHeight, x: pos.x, y: pos.y })}
              onClick={e => {
                e.stopPropagation()
                if (el.type === 'placeholder') {
                  placeholderTarget.current = el.id
                  placeholderInputRef.current?.click()
                } else if (el.type === 'text' && selectedId === el.id) {
                  setEditingId(el.id)
                } else {
                  setSelectedId(el.id)
                  setEditingId(null)
                }
              }}
            >
              <div style={{ width: '100%', height: '100%', transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined }}>
                {el.type === 'photo' && (
                  <img src={el.imageUrl} alt=""
                    className={`frame-${el.frame || 'none'} filter-${el.filter || 'none'}`}
                    draggable={false}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }} />
                )}
                {el.type === 'placeholder' && (
                  <div style={{ width: '100%', height: '100%', border: '2px dashed #bbb', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(0,0,0,0.02)', userSelect: 'none' }}>
                    <div style={{ fontSize: 26, color: '#bbb', lineHeight: 1 }}>+</div>
                    <div style={{ fontSize: 10, color: '#bbb', marginTop: 5 }}>Tap to add photo</div>
                  </div>
                )}
                {el.type === 'emoji' && (
                  <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: Math.min(el.width, el.height) * 0.8,
                    lineHeight: 1, userSelect: 'none', cursor: 'default',
                  }}>
                    {el.content}
                  </div>
                )}
                {el.type === 'text' && (
                  editingId === el.id ? (
                    <textarea
                      autoFocus
                      value={el.content}
                      onChange={e => updateEl(el.id, { content: e.target.value })}
                      onBlur={() => setEditingId(null)}
                      onClick={e => e.stopPropagation()}
                      placeholder="Type here…"
                      style={{
                        width: '100%', height: '100%',
                        fontSize: el.fontSize, color: el.color, fontFamily: el.fontFamily,
                        background: 'transparent', border: 'none', outline: 'none',
                        resize: 'none', cursor: 'text', lineHeight: 1.6, padding: 0,
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      }}
                    />
                  ) : (
                    <div style={{
                      fontSize: el.fontSize, color: el.color, fontFamily: el.fontFamily,
                      width: '100%', height: '100%', overflow: 'hidden',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6,
                      userSelect: 'none', cursor: 'text',
                    }}>
                      {el.content || <span style={{ color: '#888', fontStyle: 'italic', fontSize: Math.min(el.fontSize, 13) }}>Tap to select · tap again to type</span>}
                    </div>
                  )
                )}
              </div>
            </Rnd>
          ))}
        </div>
      </div>
    </div>
  )
}
