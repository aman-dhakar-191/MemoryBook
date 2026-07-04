import { useState, useCallback, useRef, useEffect } from 'react'
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
  { id: 'full', label: 'Full', slots: [{ x: G, y: G, w: PAGE_W - G * 2, h: CH - G * 2 }] },
  { id: 'side-by-side', label: 'Side by Side', slots: [{ x: G, y: G, w: hw, h: CH - G * 2 }, { x: G * 2 + hw, y: G, w: hw, h: CH - G * 2 }] },
  { id: 'top-bottom', label: 'Top & Bottom', slots: [{ x: G, y: G, w: PAGE_W - G * 2, h: hh }, { x: G, y: G * 2 + hh, w: PAGE_W - G * 2, h: hh }] },
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
  { id: 'grid', label: 'Grid 2×2', slots: [{ x: G, y: G, w: hw, h: hh }, { x: G * 2 + hw, y: G, w: hw, h: hh }, { x: G, y: G * 2 + hh, w: hw, h: hh }, { x: G * 2 + hw, y: G * 2 + hh, w: hw, h: hh }] },
  { id: 'three-col', label: '3 Cols', slots: [{ x: G, y: G, w: tw, h: CH - G * 2 }, { x: G * 2 + tw, y: G, w: tw, h: CH - G * 2 }, { x: G * 3 + tw * 2, y: G, w: tw, h: CH - G * 2 }] },
  { id: 'three-row', label: '3 Rows', slots: [{ x: G, y: G, w: PAGE_W - G * 2, h: th }, { x: G, y: G * 2 + th, w: PAGE_W - G * 2, h: th }, { x: G, y: G * 3 + th * 2, w: PAGE_W - G * 2, h: th }] },
  {
    id: 'featured-right', label: 'Featured Right',
    slots: [
      { x: G, y: G, w: Math.floor((PAGE_W - G * 3) * 0.4), h: hh },
      { x: G, y: G * 2 + hh, w: Math.floor((PAGE_W - G * 3) * 0.4), h: hh },
      { x: G * 2 + Math.floor((PAGE_W - G * 3) * 0.4), y: G, w: Math.floor((PAGE_W - G * 3) * 0.6), h: CH - G * 2 },
    ],
  },
  {
    id: 'two-three', label: '2 + 3',
    slots: [
      { x: G, y: G, w: hw, h: hh },
      { x: G * 2 + hw, y: G, w: hw, h: hh },
      { x: G, y: G * 2 + hh, w: tw, h: hh },
      { x: G * 2 + tw, y: G * 2 + hh, w: tw, h: hh },
      { x: G * 3 + tw * 2, y: G * 2 + hh, w: tw, h: hh },
    ],
  },
  {
    id: 'top-strip', label: 'Top + Strip',
    slots: [
      { x: G, y: G, w: PAGE_W - G * 2, h: Math.floor((CH - G * 3) * 0.62) },
      { x: G, y: G * 2 + Math.floor((CH - G * 3) * 0.62), w: tw, h: Math.floor((CH - G * 3) * 0.38) },
      { x: G * 2 + tw, y: G * 2 + Math.floor((CH - G * 3) * 0.62), w: tw, h: Math.floor((CH - G * 3) * 0.38) },
      { x: G * 3 + tw * 2, y: G * 2 + Math.floor((CH - G * 3) * 0.62), w: tw, h: Math.floor((CH - G * 3) * 0.38) },
    ],
  },
  {
    id: 'grid-3x3', label: 'Grid 3×3',
    slots: [
      { x: G,        y: G,        w: tw, h: th }, { x: G*2+tw,   y: G,        w: tw, h: th }, { x: G*3+tw*2, y: G,        w: tw, h: th },
      { x: G,        y: G*2+th,   w: tw, h: th }, { x: G*2+tw,   y: G*2+th,   w: tw, h: th }, { x: G*3+tw*2, y: G*2+th,   w: tw, h: th },
      { x: G,        y: G*3+th*2, w: tw, h: th }, { x: G*2+tw,   y: G*3+th*2, w: tw, h: th }, { x: G*3+tw*2, y: G*3+th*2, w: tw, h: th },
    ],
  },
]

const BACKGROUNDS = [
  { color: '#fffdf8', label: 'Cream' }, { color: '#f8f8ff', label: 'White' },
  { color: '#fef3e8', label: 'Warm' }, { color: '#eef2ff', label: 'Sky' },
  { color: '#fdf2f8', label: 'Rose' }, { color: '#f0fdf4', label: 'Mint' },
  { color: '#1e1e2e', label: 'Night' },
]

const FRAMES = ['none','classic','polaroid','vintage','rounded','gold','shadow','thin','film','double','circle','oval','arch','diamond','hex','star']

const FILTERS = [
  { id: 'none', label: 'Normal' }, { id: 'bw', label: 'B&W' }, { id: 'sepia', label: 'Sepia' },
  { id: 'warm', label: 'Warm' }, { id: 'cool', label: 'Cool' }, { id: 'faded', label: 'Faded' },
  { id: 'vivid', label: 'Vivid' }, { id: 'dramatic', label: 'Dramatic' },
  { id: 'blur-sm', label: 'Blur S' }, { id: 'blur-md', label: 'Blur M' },
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
  const sx = 60 / PAGE_W, sy = 46 / PAGE_H
  return (
    <svg width={60} height={46} style={{ display: 'block' }}>
      <rect width={60} height={46} fill="#242424" rx={3} />
      {slots.map((s, i) => (
        <rect key={i} x={s.x * sx} y={s.y * sy} width={s.w * sx} height={s.h * sy} fill="#5a5a5a" rx={1.5} />
      ))}
    </svg>
  )
}

const divider = <div style={{ width: 1, height: 18, background: '#333', flexShrink: 0 }} />

export default function PageEditor({ album, page, onSave, onCancel }) {
  const [elements, setElements] = useState(page.elements || [])
  const [background, setBackground] = useState(page.background || '#fffdf8')
  const [selectedId, setSelectedId] = useState(null)
  const [textOverlayId, setTextOverlayId] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadCount, setUploadCount] = useState({ done: 0, total: 0 })
  const [saving, setSaving] = useState(false)
  const [showLayouts, setShowLayouts] = useState(false)
  const [showStickers, setShowStickers] = useState(false)
  const [scale, setScale] = useState(1)

  const canvasRef = useRef(null)
  const placeholderInputRef = useRef(null)
  const placeholderTarget = useRef(null)

  // All currently active pointers: { pointerId, elId, startCX, startCY, curCX, curCY, startElX, startElY, startTime }
  const ptrs = useRef([])
  // Current gesture: { type:'drag'|'pinch'|'rot-handle'|'resize-handle', elId, ... }
  const gesture = useRef(null)

  useEffect(() => {
    const update = () => setScale(Math.min(1, (window.innerWidth - 8) / PAGE_W))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const selected = elements.find(e => e.id === selectedId)
  const textOverlayEl = elements.find(e => e.id === textOverlayId)

  function closeSheets() { setShowLayouts(false); setShowStickers(false) }
  function deselect() { setSelectedId(null); setTextOverlayId(null); closeSheets() }

  function updateEl(id, patch) {
    setElements(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e))
  }
  function deleteSelected() {
    setElements(prev => prev.filter(e => e.id !== selectedId))
    setSelectedId(null); setTextOverlayId(null)
  }
  function bringToFront() {
    setElements(prev => {
      const i = prev.findIndex(e => e.id === selectedId)
      if (i < 0 || i === prev.length - 1) return prev
      const next = [...prev]
      const [el] = next.splice(i, 1)
      return [...next, el]
    })
  }
  function sendToBack() {
    setElements(prev => {
      const i = prev.findIndex(e => e.id === selectedId)
      if (i <= 0) return prev
      const next = [...prev]
      const [el] = next.splice(i, 1)
      return [el, ...next]
    })
  }
  function moveStep(dir) {
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
    const rest = elements.filter(e => e.type === 'text' || e.type === 'emoji')
    const newEls = layout.slots.map((s, i) =>
      i < photos.length
        ? { ...photos[i], x: s.x, y: s.y, width: s.w, height: s.h }
        : { id: uuid(), type: 'placeholder', x: s.x, y: s.y, width: s.w, height: s.h, rotation: 0 }
    )
    setElements([...rest, ...newEls])
    setSelectedId(null); setTextOverlayId(null); setShowLayouts(false)
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
    } finally { setUploading(false); placeholderTarget.current = null }
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
      newEls.push({ id: uuid(), type: 'photo', imageUrl: url, storagePath: path, frame: 'none', filter: 'none', x: 30 + i * 22, y: 30 + i * 22, width: Math.round(elW), height: Math.round(elH), rotation: 0 })
      setUploadCount({ done: i + 1, total: accepted.length })
    }
    setElements(prev => [...prev, ...newEls])
    setSelectedId(newEls[newEls.length - 1]?.id ?? null)
    setUploading(false)
  }, [album.id])

  const { getInputProps, open } = useDropzone({ onDrop, accept: { 'image/*': [] }, noClick: true, maxSize: 20 * 1024 * 1024 })

  function openTextOverlay(id) {
    overlayOpenTimeRef.current = Date.now()
    setTextOverlayId(id)
  }

  function addText() {
    const id = uuid()
    const el = { id, type: 'text', content: '', fontSize: 18, color: '#333333', fontFamily: 'Inter', x: 60, y: 60, width: 240, height: 80, rotation: 0 }
    setElements(prev => [...prev, el])
    setSelectedId(id)
    openTextOverlay(id)
  }

  function addEmoji(emoji) {
    const el = { id: uuid(), type: 'emoji', content: emoji, x: 160, y: 220, width: 80, height: 80, rotation: 0 }
    setElements(prev => [...prev, el])
    setSelectedId(el.id); setShowStickers(false)
  }

  async function handleSave() {
    document.activeElement?.blur()
    setSaving(true); setTextOverlayId(null)
    try {
      await updatePage(album.id, page.id, { elements, background })
      onSave({ ...page, elements, background })
    } finally { setSaving(false) }
  }

  // ── Gesture system (replaces react-rnd) ───────────────────────────────────
  // Uses Pointer Events API which handles both mouse and touch uniformly.
  // Two pointers on same element → pinch to resize + twist to rotate.
  // Single pointer → tap to select / drag to move.

  function elPointerDown(el, e) {
    // Prevent the browser's synthetic click that fires after pointerup on touch/pen.
    // Without this, the click lands on the overlay backdrop (which is now rendered on top)
    // and immediately closes the text overlay that was just opened in elPointerUp.
    if (e.pointerType !== 'mouse') e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)

    ptrs.current.push({
      pointerId: e.pointerId, elId: el.id,
      startCX: e.clientX, startCY: e.clientY,
      curCX: e.clientX, curCY: e.clientY,
      startElX: el.x, startElY: el.y,
      startTime: Date.now(),
    })

    const ep = ptrs.current.filter(p => p.elId === el.id)

    if (ep.length >= 2) {
      // Two fingers → switch to pinch/rotate
      const p1 = ep[ep.length - 2], p2 = ep[ep.length - 1]
      gesture.current = {
        type: 'pinch', elId: el.id,
        startDist: Math.hypot(p2.startCX - p1.startCX, p2.startCY - p1.startCY),
        startAngle: Math.atan2(p2.startCY - p1.startCY, p2.startCX - p1.startCX) * 180 / Math.PI,
        startW: el.width, startH: el.height, startRot: el.rotation || 0,
        keepAspect: el.type === 'photo',
      }
      // Select on two-finger gesture
      setSelectedId(el.id)
    } else {
      gesture.current = {
        type: 'drag', elId: el.id, pointerId: e.pointerId,
        moved: false,
      }
    }
  }

  function elPointerMove(el, e) {
    const ptr = ptrs.current.find(p => p.pointerId === e.pointerId)
    if (ptr) { ptr.curCX = e.clientX; ptr.curCY = e.clientY }

    const g = gesture.current
    if (!g || g.elId !== el.id) return

    if (g.type === 'drag' && g.pointerId === e.pointerId) {
      const p = ptrs.current.find(p => p.pointerId === e.pointerId)
      if (!p) return
      const dx = (e.clientX - p.startCX) / scale
      const dy = (e.clientY - p.startCY) / scale
      if (!g.moved && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) g.moved = true
      if (g.moved) {
        pendingUpdateRef.current = {
          id: el.id,
          x: Math.max(-el.width + 20, Math.min(PAGE_W - 20, p.startElX + dx)),
          y: Math.max(-el.height + 20, Math.min(PAGE_H - 20, p.startElY + dy)),
        }
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
            if (pendingUpdateRef.current) {
              const { id, ...patch } = pendingUpdateRef.current
              updateEl(id, patch)
              pendingUpdateRef.current = null
            }
            rafRef.current = null
          })
        }
      }
    } else if (g.type === 'pinch') {
      const ep = ptrs.current.filter(p => p.elId === el.id)
      if (ep.length < 2) return
      const p1 = ep[ep.length - 2], p2 = ep[ep.length - 1]
      const dist = Math.hypot(p2.curCX - p1.curCX, p2.curCY - p1.curCY)
      const angle = Math.atan2(p2.curCY - p1.curCY, p2.curCX - p1.curCX) * 180 / Math.PI
      const sf = g.startDist > 0 ? dist / g.startDist : 1
      const dAngle = angle - g.startAngle
      const newW = Math.max(40, Math.round(g.startW * sf))
      const newH = g.keepAspect
        ? Math.round(newW * g.startH / g.startW)
        : Math.max(40, Math.round(g.startH * sf))
      pendingUpdateRef.current = { id: el.id, width: newW, height: newH, rotation: Math.round(g.startRot + dAngle) }
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          if (pendingUpdateRef.current) {
            const { id, ...patch } = pendingUpdateRef.current
            updateEl(id, patch)
            pendingUpdateRef.current = null
          }
          rafRef.current = null
        })
      }
    }
  }

  function elPointerUp(el, e) {
    const ptr = ptrs.current.find(p => p.pointerId === e.pointerId)
    const g = gesture.current

    // Tap: check final distance from start — more reliable than incremental moved flag
    // (avoids false positives from Android touch jitter during finger placement)
    if (ptr && g?.type === 'drag' && g.pointerId === e.pointerId) {
      const dist = Math.hypot(e.clientX - ptr.startCX, e.clientY - ptr.startCY)
      const elapsed = Date.now() - ptr.startTime
      if (dist < 12 && elapsed < 500) {
        if (el.type === 'placeholder') {
          placeholderTarget.current = el.id
          placeholderInputRef.current?.click()
        } else if (el.type === 'text') {
          setSelectedId(el.id)
          openTextOverlay(el.id)
        } else {
          setSelectedId(el.id)
        }
      }
    }

    ptrs.current = ptrs.current.filter(p => p.pointerId !== e.pointerId)
    const remaining = ptrs.current.filter(p => p.elId === el.id)

    if (remaining.length === 0) {
      gesture.current = null
    } else if (remaining.length === 1 && g?.type === 'pinch') {
      // Back to single-finger after pinch
      const p = remaining[0]
      gesture.current = {
        type: 'drag', elId: el.id, pointerId: p.pointerId,
        moved: false,
      }
    }
  }

  function elPointerCancel(el, e) {
    ptrs.current = ptrs.current.filter(p => p.pointerId !== e.pointerId)
    if (!ptrs.current.some(p => p.elId === el.id)) gesture.current = null
  }

  // ── Rotation handle ────────────────────────────────────────────────────────
  const rotG = useRef(null)

  function rotDown(el, e) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const rect = canvasRef.current.getBoundingClientRect()
    rotG.current = {
      pointerId: e.pointerId, elId: el.id,
      cx: rect.left + (el.x + el.width / 2) * scale,
      cy: rect.top + (el.y + el.height / 2) * scale,
    }
  }
  function rotMove(e) {
    const r = rotG.current
    if (!r || r.pointerId !== e.pointerId) return
    const angle = Math.atan2(e.clientY - r.cy, e.clientX - r.cx) * 180 / Math.PI + 90
    updateEl(r.elId, { rotation: Math.round(angle) })
  }
  function rotUp(e) {
    rotG.current = null
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
  }

  // ── Desktop corner resize handles ─────────────────────────────────────────
  const resG = useRef(null)
  const rafRef = useRef(null)
  const pendingUpdateRef = useRef(null)
  const overlayOpenTimeRef = useRef(0)

  function resDown(el, corner, e) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    resG.current = {
      pointerId: e.pointerId, elId: el.id, corner,
      startCX: e.clientX, startCY: e.clientY,
      startX: el.x, startY: el.y, startW: el.width, startH: el.height,
      keepAspect: el.type === 'photo' ? el.width / el.height : null,
    }
  }
  function resMove(e) {
    const r = resG.current
    if (!r || r.pointerId !== e.pointerId) return
    const dx = (e.clientX - r.startCX) / scale
    const dy = (e.clientY - r.startCY) / scale
    let x = r.startX, y = r.startY, w = r.startW, h = r.startH
    if (r.corner.includes('e')) w = Math.max(40, r.startW + dx)
    if (r.corner.includes('w')) { w = Math.max(40, r.startW - dx); x = r.startX + r.startW - w }
    if (r.corner.includes('s')) h = Math.max(40, r.startH + dy)
    if (r.corner.includes('n')) { h = Math.max(40, r.startH - dy); y = r.startY + r.startH - h }
    if (r.keepAspect) h = w / r.keepAspect
    updateEl(r.elId, { x, y, width: Math.round(w), height: Math.round(h) })
  }
  function resUp(e) {
    resG.current = null
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
  }

  // ── Rotation handle position (in canvas coords) ────────────────────────────
  function rotPos(el) {
    const rot = (el.rotation || 0) * Math.PI / 180
    const dist = Math.max(el.width, el.height) / 2 + 32
    return {
      x: el.x + el.width / 2 + dist * Math.sin(rot) - 14,
      y: el.y + el.height / 2 - dist * Math.cos(rot) - 14,
    }
  }

  // ── Delete button position — rotated top-right corner ─────────────────────
  function deleteButtonPos(el) {
    const rot = (el.rotation || 0) * Math.PI / 180
    const cx = el.x + el.width / 2
    const cy = el.y + el.height / 2
    const dx = el.width / 2
    const dy = -el.height / 2
    return {
      x: cx + dx * Math.cos(rot) - dy * Math.sin(rot) - 12,
      y: cy + dx * Math.sin(rot) + dy * Math.cos(rot) - 12,
    }
  }

  const sel = (s = {}) => ({ background: '#252525', color: 'white', border: '1px solid #333', borderRadius: 6, fontSize: 11, padding: '3px 5px', flexShrink: 0, ...s })
  const btn = (s = {}) => ({ border: 'none', borderRadius: 6, fontSize: 12, padding: '5px 10px', cursor: 'pointer', flexShrink: 0, ...s })

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#0f0f0f' }}>
      <input {...getInputProps()} />
      <input ref={placeholderInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePlaceholderFile} />

      {/* ── Toolbar ── */}
      <div data-toolbar style={{ display: 'flex', alignItems: 'center', background: '#1a1a1a', borderBottom: '1px solid #2a2a2a', flexShrink: 0, minHeight: 44 }}>
        <button onClick={onCancel} style={{ color: '#aaa', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', padding: '0 10px', flexShrink: 0, height: 44, display: 'flex', alignItems: 'center' }}>← Back</button>
        <div style={{ width: 1, height: 24, background: '#333', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 7, overflowX: 'auto', padding: '0 10px', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
          <button onClick={open} disabled={uploading} style={btn({ background: '#1d4ed8', color: 'white', opacity: uploading ? 0.6 : 1 })}>
            {uploading ? `↑${uploadCount.done}/${uploadCount.total}` : '+ Photos'}
          </button>
          <button onClick={addText} style={btn({ background: '#7c3aed', color: 'white' })}>+ Text</button>
          <button onClick={() => { setShowStickers(v => !v); setShowLayouts(false) }} style={btn({ background: '#b45309', color: 'white' })}>😊 Sticker</button>
          <button onClick={() => { setShowLayouts(v => !v); setShowStickers(false) }} style={btn({ background: '#0f766e', color: 'white' })}>⋎ Layout</button>
          {divider}
          <span style={{ color: '#666', fontSize: 11, flexShrink: 0 }}>BG</span>
          {BACKGROUNDS.map(bg => (
            <button key={bg.color} title={bg.label} onClick={() => setBackground(bg.color)}
              style={{ width: 18, height: 18, borderRadius: '50%', background: bg.color, border: background === bg.color ? '2px solid white' : '2px solid #444', transform: background === bg.color ? 'scale(1.25)' : 'scale(1)', transition: 'all .15s', cursor: 'pointer', flexShrink: 0 }} />
          ))}
          {selected && (
            <>
              {divider}
              {selected.type === 'photo' && (
                <>
                  <select value={selected.frame || 'none'} onChange={e => updateEl(selected.id, { frame: e.target.value })} style={sel()}>
                    {FRAMES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <select value={selected.filter || 'none'} onChange={e => updateEl(selected.id, { filter: e.target.value })} style={sel()}>
                    {FILTERS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                </>
              )}
              {selected.type === 'text' && (
                <>
                  <button onClick={() => openTextOverlay(selected.id)} style={btn({ background: '#7c3aed', color: 'white' })}>✎ Edit</button>
                  <select value={selected.fontFamily} onChange={e => updateEl(selected.id, { fontFamily: e.target.value })} style={sel({ maxWidth: 110 })}>
                    {FONTS.map(f => <option key={f}>{f}</option>)}
                  </select>
                  <input type="number" value={selected.fontSize} min={10} max={96} onChange={e => updateEl(selected.id, { fontSize: +e.target.value })} style={sel({ width: 46 })} />
                  <input type="color" value={selected.color} onChange={e => updateEl(selected.id, { color: e.target.value })} style={{ width: 26, height: 26, border: 'none', cursor: 'pointer', borderRadius: 4, flexShrink: 0 }} />
                </>
              )}
              {divider}
              <button onClick={() => moveStep(-1)} style={{ color: '#888', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '0 2px', flexShrink: 0 }} title="Move backward one step">↓</button>
              <button onClick={() => moveStep(1)} style={{ color: '#888', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '0 2px', flexShrink: 0 }} title="Move forward one step">↑</button>
              <button onClick={sendToBack} style={{ color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, padding: '0 2px', flexShrink: 0 }} title="Send to back">⬇Back</button>
              <button onClick={bringToFront} style={{ color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, padding: '0 2px', flexShrink: 0 }} title="Bring to front">⬆Front</button>
              <button onClick={deleteSelected} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '0 2px', flexShrink: 0 }}>✕</button>
            </>
          )}
        </div>
        <div style={{ width: 1, height: 24, background: '#333', flexShrink: 0 }} />
        <button onClick={handleSave} disabled={saving}
          style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: 0, fontSize: 13, fontWeight: 700, padding: '0 14px', cursor: 'pointer', height: 44, flexShrink: 0, opacity: saving ? 0.5 : 1 }}>
          {saving ? '✓…' : 'Save'}
        </button>
      </div>

      {/* ── Backdrop ── */}
      {(showLayouts || showStickers) && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.55)' }} onClick={closeSheets} />
      )}

      {/* ── Layout sheet ── */}
      {showLayouts && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, background: '#1c1c1c', borderRadius: '16px 16px 0 0', padding: '12px 16px 32px' }}>
          <div style={{ width: 36, height: 4, background: '#444', borderRadius: 2, margin: '0 auto 14px' }} />
          <p style={{ color: '#555', fontSize: 11, marginBottom: 12, textAlign: 'center' }}>Photos rearranged — empty slots become placeholders</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {LAYOUTS.map(l => (
              <button key={l.id} onClick={() => applyLayout(l)}
                style={{ background: 'none', border: '1px solid #333', borderRadius: 8, padding: 8, cursor: 'pointer', textAlign: 'center' }}>
                <LayoutPreview slots={l.slots} />
                <div style={{ color: '#aaa', fontSize: 10, marginTop: 5, lineHeight: 1.2 }}>{l.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Sticker sheet ── */}
      {showStickers && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, background: '#1c1c1c', borderRadius: '16px 16px 0 0', padding: '12px 12px 32px', maxHeight: '52vh', overflowY: 'auto' }}>
          <div style={{ width: 36, height: 4, background: '#444', borderRadius: 2, margin: '0 auto 12px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4 }}>
            {STICKERS.map((emoji, i) => (
              <button key={i} onClick={() => addEmoji(emoji)}
                style={{ background: 'none', border: 'none', fontSize: 28, cursor: 'pointer', padding: '5px 0', borderRadius: 6, lineHeight: 1 }}>
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Text editing overlay ── */}
      {textOverlayEl && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.65)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
          onClick={() => { if (Date.now() - overlayOpenTimeRef.current > 350) setTextOverlayId(null) }}>
          <div style={{ background: '#1c1c1c', borderRadius: '16px 16px 0 0', padding: '14px 16px max(28px, env(safe-area-inset-bottom))' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ color: '#777', fontSize: 12, flexShrink: 0 }}>Style</span>
              <select value={textOverlayEl.fontFamily} onChange={e => updateEl(textOverlayEl.id, { fontFamily: e.target.value })}
                style={{ background: '#252525', color: 'white', border: '1px solid #333', borderRadius: 6, fontSize: 11, padding: '3px 5px', flex: 1, maxWidth: 130 }}>
                {FONTS.map(f => <option key={f}>{f}</option>)}
              </select>
              <input type="number" value={textOverlayEl.fontSize} min={10} max={96}
                onChange={e => updateEl(textOverlayEl.id, { fontSize: +e.target.value })}
                style={{ background: '#252525', color: 'white', border: '1px solid #333', borderRadius: 6, fontSize: 11, padding: '3px 5px', width: 48 }} />
              <input type="color" value={textOverlayEl.color}
                onChange={e => updateEl(textOverlayEl.id, { color: e.target.value })}
                style={{ width: 26, height: 26, border: 'none', cursor: 'pointer', borderRadius: 4, flexShrink: 0 }} />
              <button onClick={() => setTextOverlayId(null)}
                style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, padding: '5px 14px', cursor: 'pointer', flexShrink: 0 }}>
                Done
              </button>
            </div>
            <textarea
              autoFocus
              value={textOverlayEl.content}
              onChange={e => updateEl(textOverlayEl.id, { content: e.target.value })}
              placeholder="Type here…"
              rows={5}
              style={{
                width: '100%', background: '#252525',
                color: textOverlayEl.color, fontFamily: textOverlayEl.fontFamily,
                fontSize: Math.max(textOverlayEl.fontSize, 16),
                border: '1px solid #3a3a3a', borderRadius: 8,
                padding: '10px 12px', resize: 'none', outline: 'none',
                lineHeight: 1.6, boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      )}

      {/* ── Canvas ── */}
      <div
        style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '12px 4px' }}
        onClick={deselect}
      >
        {/* Wrapper sized to the scaled canvas so layout flow is correct */}
        <div style={{ width: PAGE_W * scale, height: PAGE_H * scale, position: 'relative', flexShrink: 0 }}
          onClick={e => e.stopPropagation()}>

          {/* The actual canvas — rendered at PAGE_W×PAGE_H then CSS-scaled */}
          <div
            ref={canvasRef}
            style={{
              position: 'absolute',
              width: PAGE_W, height: PAGE_H,
              background,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}
          >
            {elements.map((el, index) => {
              const isSelected = selectedId === el.id
              const rot = el.rotation || 0
              return (
                <div
                  key={el.id}
                  style={{
                    position: 'absolute',
                    left: el.x, top: el.y,
                    width: el.width, height: el.height,
                    transform: rot ? `rotate(${rot}deg)` : undefined,
                    transformOrigin: 'center center',
                    outline: isSelected ? '2px solid #60a5fa' : 'none',
                    outlineOffset: 2,
                    zIndex: index + 1,
                    cursor: el.type === 'placeholder' ? 'pointer' : 'grab',
                    touchAction: 'none',
                    userSelect: 'none',
                  }}
                  onPointerDown={e => elPointerDown(el, e)}
                  onPointerMove={e => elPointerMove(el, e)}
                  onPointerUp={e => elPointerUp(el, e)}
                  onPointerCancel={e => elPointerCancel(el, e)}
                  onClick={e => e.stopPropagation()}
                >
                  {/* Content */}
                  {el.type === 'photo' && (
                    <img src={el.imageUrl} alt=""
                      className={`frame-${el.frame || 'none'} filter-${el.filter || 'none'}`}
                      draggable={false}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }} />
                  )}
                  {el.type === 'placeholder' && (
                    <div style={{ width: '100%', height: '100%', border: '2px dashed #bbb', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.02)' }}>
                      <div style={{ fontSize: 26, color: '#bbb', lineHeight: 1 }}>+</div>
                      <div style={{ fontSize: 10, color: '#bbb', marginTop: 5 }}>Tap to add photo</div>
                    </div>
                  )}
                  {el.type === 'emoji' && (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.min(el.width, el.height) * 0.8, lineHeight: 1, pointerEvents: 'none' }}>
                      {el.content}
                    </div>
                  )}
                  {el.type === 'text' && (
                    <div style={{ width: '100%', height: '100%', fontSize: el.fontSize, color: el.color, fontFamily: el.fontFamily, overflow: 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6, pointerEvents: 'none' }}>
                      {el.content || <span style={{ color: '#aaa', fontStyle: 'italic', fontSize: Math.min(el.fontSize, 13) }}>Tap to edit…</span>}
                    </div>
                  )}

                  {/* Desktop corner resize handles (mouse only — touch uses pinch) */}
                  {isSelected && el.type !== 'placeholder' && ['nw','ne','se','sw'].map(corner => (
                    <div key={corner}
                      style={{
                        position: 'absolute',
                        left: corner.includes('e') ? el.width - 6 : -6,
                        top: corner.includes('s') ? el.height - 6 : -6,
                        width: 12, height: 12,
                        background: 'white', border: '2px solid #60a5fa', borderRadius: '50%',
                        zIndex: 10, touchAction: 'none',
                        cursor: `${corner}-resize`,
                      }}
                      onPointerDown={e => {
                        if (e.pointerType === 'touch') return
                        e.stopPropagation()
                        resDown(el, corner, e)
                      }}
                      onPointerMove={e => resMove(e)}
                      onPointerUp={e => resUp(e)}
                    />
                  ))}
                </div>
              )
            })}

            {/* Rotation handle — always visible when element is selected */}
            {selected && selected.type !== 'placeholder' && (() => {
              const { x, y } = rotPos(selected)
              return (
                <div
                  style={{
                    position: 'absolute', left: x, top: y,
                    width: 28, height: 28, borderRadius: '50%',
                    background: '#3b82f6', border: '2px solid white',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.45)',
                    cursor: 'grab', zIndex: elements.length + 20,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, color: 'white', userSelect: 'none', touchAction: 'none',
                  }}
                  onPointerDown={e => rotDown(selected, e)}
                  onPointerMove={e => rotMove(e)}
                  onPointerUp={e => rotUp(e)}
                  onClick={e => e.stopPropagation()}
                >
                  ↻
                </div>
              )
            })()}

            {/* Delete button — red ✕ at rotated top-right corner */}
            {selected && selected.type !== 'placeholder' && (() => {
              const { x, y } = deleteButtonPos(selected)
              return (
                <div
                  style={{
                    position: 'absolute', left: x, top: y,
                    width: 24, height: 24, borderRadius: '50%',
                    background: '#ef4444', border: '2px solid white',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.45)',
                    cursor: 'pointer', zIndex: elements.length + 21,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: 'white',
                    userSelect: 'none', touchAction: 'none',
                  }}
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); deleteSelected() }}
                >
                  ✕
                </div>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}
