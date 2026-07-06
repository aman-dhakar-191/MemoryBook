import React, { useRef, useState, useEffect, useCallback } from 'react'
import HTMLFlipBook from 'react-pageflip'
import { useDropzone } from 'react-dropzone'
import { subscribePages, addPage, updateAlbum, deleteAlbumWithPages } from '../firebase/firestore'
import { uploadPhoto } from '../firebase/storage'
import BookPage from '../components/BookPage'
import PageEditor from './PageEditor'

export const PAGE_W = 460
export const PAGE_H = 640

const FlipPage = React.forwardRef(({ children, style }, ref) => (
  <div ref={ref} style={{ width: PAGE_W, height: PAGE_H, overflow: 'hidden', ...style }}>
    {children}
  </div>
))
FlipPage.displayName = 'FlipPage'

export default function BookView({ album, onBack, onAlbumUpdate, initialEditPageId, initialPageIndex = 0, onEditorPageCleared }) {
  const bookRef = useRef()
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingPage, setEditingPage] = useState(null)
  const pendingEditPageIdRef = useRef(initialEditPageId)
  const pendingPageIndexRef = useRef(initialPageIndex)
  const [coverUrl, setCoverUrl] = useState(album.coverUrl || null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 700)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const [currentFlipPage, setCurrentFlipPage] = useState(initialPageIndex)
  const returnPageRef = useRef(initialPageIndex)
  const [jumpMode, setJumpMode] = useState(false)
  const [jumpInput, setJumpInput] = useState('')
  const jumpInputRef = useRef(null)
  const jumpHoldTimer = useRef(null)

  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 700)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  useEffect(() => {
    setLoading(true)
    const unsub = subscribePages(album.id, pages => {
      setPages(pages)
      setLoading(false)
      // Restore editor state from URL
      if (pendingEditPageIdRef.current) {
        const page = pages.find(p => p.id === pendingEditPageIdRef.current)
        if (page) {
          openPageEditor(page, pages)
          pendingEditPageIdRef.current = null
          onEditorPageCleared?.()
        }
      }
      // Jump to saved page index on first load
      if (pendingPageIndexRef.current > 0) {
        const target = pendingPageIndexRef.current
        pendingPageIndexRef.current = 0
        setTimeout(() => {
          bookRef.current?.pageFlip().flip(target)
        }, 80)
      }
    })
    return unsub
  }, [album.id])

  // Update URL (replaceState — no history entry per flip) and currentFlipPage state
  function handleFlip(e) {
    const page = e.data
    setCurrentFlipPage(page)
    history.replaceState(
      { albumId: album.id, pageIndex: page },
      '',
      `#/${album.id}${page > 0 ? `/${page}` : ''}`
    )
  }

  function openPageEditor(page, pagesArr) {
    const list = pagesArr || pages
    const pageIdx = list.findIndex(p => p.id === page.id)
    returnPageRef.current = pageIdx >= 0 ? pageIdx + 1 : currentFlipPage
    history.pushState({ albumId: album.id, pageId: page.id }, '', `#/${album.id}/edit/${page.id}`)
    setEditingPage(page)
  }

  function closeEditor() {
    const target = returnPageRef.current
    history.pushState(
      { albumId: album.id, pageIndex: target },
      '',
      `#/${album.id}${target > 0 ? `/${target}` : ''}`
    )
    setEditingPage(null)
    setTimeout(() => {
      if (bookRef.current && target > 0) {
        bookRef.current.pageFlip().flip(target)
      }
    }, 80)
  }

  async function handleAddPage() {
    const page = await addPage(album.id, pages.length)
    setPages(prev => [...prev, page])
  }

  // Handle Android back button from editor → album view
  useEffect(() => {
    if (!editingPage) return
    const onPop = () => {
      const hash = window.location.hash
      if (!hash.includes('/edit/')) {
        setEditingPage(null)
        const target = returnPageRef.current
        setTimeout(() => {
          if (bookRef.current && target > 0) {
            bookRef.current.pageFlip().flip(target)
          }
        }, 80)
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [editingPage])

  // Keyboard navigation
  useEffect(() => {
    if (editingPage) return
    const onKey = e => {
      if (e.key === 'ArrowLeft') bookRef.current?.pageFlip().flipPrev()
      else if (e.key === 'ArrowRight') bookRef.current?.pageFlip().flipNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editingPage])

  async function handleDeleteAlbum() {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteAlbumWithPages(album.id)
      onBack()
    } catch (err) {
      setDeleteError('Delete failed — check your connection')
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  function startJumpHold() {
    if (pages.length === 0 || currentFlipPage < 1 || currentFlipPage > pages.length) return
    jumpHoldTimer.current = setTimeout(() => {
      setJumpInput(String(currentFlipPage))
      setJumpMode(true)
      setTimeout(() => jumpInputRef.current?.select(), 0)
    }, 500)
  }

  function cancelJumpHold() {
    clearTimeout(jumpHoldTimer.current)
  }

  function commitJump() {
    const n = parseInt(jumpInput, 10)
    if (!isNaN(n) && n >= 1 && n <= pages.length) {
      // react-pageflip's internal index includes cover + implicit spread pages,
      // so the visual page N sits at flip index N - 2
      bookRef.current?.pageFlip().flip(Math.max(0, n - 2))
    }
    setJumpMode(false)
  }

  const onCoverDrop = useCallback(async accepted => {
    const file = accepted[0]
    if (!file) return
    setUploadingCover(true)
    try {
      const { url } = await uploadPhoto(file, null, `memorybook/${album.id}`)
      setCoverUrl(url)
      await updateAlbum(album.id, { coverUrl: url })
      onAlbumUpdate?.({ ...album, coverUrl: url })
    } finally {
      setUploadingCover(false)
    }
  }, [album, onAlbumUpdate])

  const { getInputProps: getCoverInputProps, open: openCoverPicker } = useDropzone({
    onDrop: onCoverDrop,
    accept: { 'image/*': [] },
    noClick: true,
    maxFiles: 1,
  })

  const currentPageObj = currentFlipPage > 0 && currentFlipPage <= pages.length
    ? pages[currentFlipPage - 1]
    : null

  if (editingPage) {
    return (
      <PageEditor
        album={album}
        page={editingPage}
        onSave={closeEditor}
        onCancel={closeEditor}
      />
    )
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#1a0f08' }}>
      <input {...getCoverInputProps()} />

      {/* Top bar */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 10px', gap: 6 }}>
          <button onClick={onBack} style={{ color: '#fbbf24', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
            ← Albums
          </button>
          <span
            title={album.title}
            style={{
              flex: 1, textAlign: 'center',
              fontFamily: 'Inter, sans-serif', fontWeight: 600,
              color: '#fde68a', fontSize: 16,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              padding: '0 4px',
            }}
          >
            {album.title}
          </span>
          {confirmDelete ? (
            <>
              <button onClick={handleDeleteAlbum} disabled={deleting}
                style={{ fontSize: 12, color: '#fff', background: '#dc2626', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', flexShrink: 0 }}>
                {deleting ? 'Deleting…' : 'Confirm Delete'}
              </button>
              <button onClick={() => setConfirmDelete(false)}
                style={{ fontSize: 12, color: '#aaa', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', flexShrink: 0 }}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button onClick={handleAddPage}
                style={{ fontSize: 12, color: '#fde68a', background: 'rgba(180,120,60,0.35)', border: '1px solid rgba(180,120,60,0.4)', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', flexShrink: 0 }}>
                + Add Page
              </button>
              <button onClick={openCoverPicker} disabled={uploadingCover}
                title="Set cover photo"
                style={{ fontSize: 16, color: '#c9a878', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', flexShrink: 0, lineHeight: 1 }}>
                {uploadingCover ? '↑' : '🖼️'}
              </button>
              <button onClick={() => setConfirmDelete(true)}
                title="Delete album"
                style={{ fontSize: 16, color: '#f87171', background: 'none', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', flexShrink: 0, lineHeight: 1 }}>
                🗑
              </button>
            </>
          )}
        </div>
        {deleteError && (
          <div style={{ fontSize: 11, color: '#fca5a5', padding: '0 12px 6px' }}>⚠️ {deleteError}</div>
        )}
      </div>

      {/* Book */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '16px 8px' }}>
        {loading ? (
          <p style={{ color: 'rgba(253,230,138,0.4)' }}>Loading pages…</p>
        ) : (
          <HTMLFlipBook
            key={`${pages.length}-${isMobile}`}
            ref={bookRef}
            width={PAGE_W}
            height={PAGE_H}
            size="fixed"
            showCover
            flippingTime={600}
            usePortrait={isMobile}
            drawShadow
            maxShadowOpacity={0.6}
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}
            onInit={e => { if (typeof e.data === 'number') setCurrentFlipPage(e.data) }}
            onFlip={handleFlip}
          >
            <FlipPage style={{ background: '#7c3a1e', position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 14, background: 'rgba(0,0,0,0.4)', zIndex: 1 }} />
              {coverUrl ? (
                <img src={coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 32px 32px' }}>
                  <div style={{ fontSize: 56, marginBottom: 24 }}>📖</div>
                  <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, color: '#fde68a', marginBottom: 16 }}>{album.title}</h2>
                  <div style={{ width: 48, height: 2, background: 'rgba(253,230,138,0.3)', margin: '0 auto 28px' }} />
                  <button onClick={openCoverPicker}
                    style={{ fontSize: 13, color: '#fde68a', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(253,230,138,0.3)', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', width: '100%' }}>
                    {uploadingCover ? 'Uploading…' : '+ Set Cover Photo'}
                  </button>
                </div>
              )}
            </FlipPage>

            {pages.length === 0 ? (
              <FlipPage style={{ background: '#fffdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: '#bbb' }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>✨</div>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>No pages yet</p>
                  <p style={{ fontSize: 11, marginTop: 4 }}>Tap "+ Add Page" to start</p>
                </div>
              </FlipPage>
            ) : (
              pages.map((page, i) => (
                <FlipPage key={page.id} style={{ background: page.background || '#fffdf8', position: 'relative' }}>
                  <BookPage page={page} pageNumber={i + 1} canvasW={PAGE_W} canvasH={PAGE_H} />
                </FlipPage>
              ))
            )}

            <FlipPage style={{ background: '#5c2d0e', position: 'relative' }}>
              <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 14, background: 'rgba(0,0,0,0.4)' }} />
            </FlipPage>
          </HTMLFlipBook>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{
        display: 'flex', alignItems: 'stretch', flexShrink: 0,
        background: 'rgba(10,5,2,0.85)', borderTop: '1px solid rgba(255,255,255,0.07)',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        minHeight: 64,
      }}>
        <button
          onClick={() => bookRef.current?.pageFlip().flipPrev()}
          style={{
            flex: 1, background: 'none', border: 'none', cursor: 'pointer',
            color: '#fde68a', fontSize: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRight: '1px solid rgba(255,255,255,0.07)',
          }}
        >◄</button>

        <div style={{
          flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 4, padding: '8px 12px',
        }}>
          {jumpMode ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ color: 'rgba(253,230,138,0.45)', fontSize: 11 }}>Page</span>
              <input
                ref={jumpInputRef}
                value={jumpInput}
                onChange={e => setJumpInput(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); commitJump() }
                  else if (e.key === 'Escape') setJumpMode(false)
                }}
                onBlur={commitJump}
                inputMode="numeric"
                style={{
                  width: 36, textAlign: 'center',
                  background: 'rgba(253,230,138,0.12)',
                  border: '1px solid rgba(253,230,138,0.5)',
                  borderRadius: 5, color: '#fde68a',
                  fontSize: 13, fontWeight: 600,
                  padding: '2px 4px', outline: 'none',
                }}
              />
              <span style={{ color: 'rgba(253,230,138,0.45)', fontSize: 11 }}>/ {pages.length}</span>
            </div>
          ) : (
            <span
              onPointerDown={startJumpHold}
              onPointerUp={cancelJumpHold}
              onPointerLeave={cancelJumpHold}
              onPointerCancel={cancelJumpHold}
              style={{
                color: 'rgba(253,230,138,0.55)', fontSize: 11, letterSpacing: '0.04em',
                userSelect: 'none', WebkitUserSelect: 'none',
                cursor: pages.length > 0 && currentFlipPage >= 1 && currentFlipPage <= pages.length ? 'pointer' : 'default',
              }}
            >
              {pages.length === 0
                ? 'Cover'
                : currentFlipPage === 0
                  ? 'Cover'
                  : currentFlipPage > pages.length
                    ? 'Back cover'
                    : `Page ${currentFlipPage} / ${pages.length}`
              }
            </span>
          )}
          {currentPageObj && (
            <button
              onClick={() => openPageEditor(currentPageObj)}
              style={{
                fontSize: 12, color: '#fde68a',
                background: 'rgba(180,120,60,0.35)',
                border: '1px solid rgba(180,120,60,0.45)',
                borderRadius: 8, padding: '5px 16px', cursor: 'pointer',
              }}
            >
              ✏️ Edit
            </button>
          )}
        </div>

        <button
          onClick={() => bookRef.current?.pageFlip().flipNext()}
          style={{
            flex: 1, background: 'none', border: 'none', cursor: 'pointer',
            color: '#fde68a', fontSize: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderLeft: '1px solid rgba(255,255,255,0.07)',
          }}
        >►</button>
      </div>
    </div>
  )
}
