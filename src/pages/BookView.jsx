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

export default function BookView({ album, onBack, onAlbumUpdate, initialEditPageId, onEditorPageCleared }) {
  const bookRef = useRef()
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingPage, setEditingPage] = useState(null)
  const pendingEditPageIdRef = useRef(initialEditPageId)
  const [coverUrl, setCoverUrl] = useState(album.coverUrl || null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 700)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [currentFlipPage, setCurrentFlipPage] = useState(0)
  const returnPageRef = useRef(0)

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
      // Restore editor state from URL (e.g. after reload on edit page)
      if (pendingEditPageIdRef.current) {
        const page = pages.find(p => p.id === pendingEditPageIdRef.current)
        if (page) {
          openPageEditor(page, pages)
          pendingEditPageIdRef.current = null
          onEditorPageCleared?.()
        }
      }
    })
    return unsub
  }, [album.id])

  function openPageEditor(page, pagesArr) {
    const list = pagesArr || pages
    const pageIdx = list.findIndex(p => p.id === page.id)
    // +1 because cover is index 0 in the flipbook
    returnPageRef.current = pageIdx >= 0 ? pageIdx + 1 : currentFlipPage
    history.pushState({ albumId: album.id, pageId: page.id }, '', `#/${album.id}/edit/${page.id}`)
    setEditingPage(page)
  }

  function closeEditor() {
    history.pushState({ albumId: album.id }, '', `#/${album.id}`)
    setEditingPage(null)
    // Restore flipbook to the page that was being edited
    const target = returnPageRef.current
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

  async function handleDeleteAlbum() {
    setDeleting(true)
    try {
      await deleteAlbumWithPages(album.id)
      onBack()
    } finally {
      setDeleting(false)
    }
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

  // Current page in the flipbook (0 = cover). Pages are 1-indexed after cover.
  // pageIndex within pages[] = currentFlipPage - 1
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
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0,
      }}>
        <button onClick={onBack} style={{ color: '#fbbf24', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}>
          ← Albums
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'Playfair Display, serif', color: '#fde68a', fontSize: 15 }}>
            {album.title}
          </span>
          <button
            onClick={openCoverPicker}
            disabled={uploadingCover}
            style={{
              fontSize: 11, color: '#c9a878',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 6, padding: '4px 9px', cursor: 'pointer',
            }}
          >
            {uploadingCover ? 'Uploading…' : '🖼️ Cover'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {confirmDelete ? (
            <>
              <button onClick={handleDeleteAlbum} disabled={deleting}
                style={{ fontSize: 11, color: '#fff', background: '#dc2626', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>
                {deleting ? 'Deleting…' : 'Confirm'}
              </button>
              <button onClick={() => setConfirmDelete(false)}
                style={{ fontSize: 11, color: '#aaa', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '5px 8px', cursor: 'pointer' }}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setConfirmDelete(true)}
                style={{ fontSize: 11, color: '#f87171', background: 'none', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
                🗑 Delete
              </button>
              <button onClick={handleAddPage}
                style={{ fontSize: 11, color: '#fde68a', background: 'rgba(180,120,60,0.35)', border: '1px solid rgba(180,120,60,0.4)', borderRadius: 6, padding: '5px 11px', cursor: 'pointer' }}>
                + Add Page
              </button>
            </>
          )}
        </div>
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
            onInit={e => setCurrentFlipPage(e.data)}
            onFlip={e => setCurrentFlipPage(e.data)}
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
                  <BookPage page={page} pageNumber={i + 1} canvasW={PAGE_W} canvasH={PAGE_H} onEdit={() => openPageEditor(page)} />
                </FlipPage>
              ))
            )}

            <FlipPage style={{ background: '#5c2d0e', position: 'relative' }}>
              <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 14, background: 'rgba(0,0,0,0.4)' }} />
            </FlipPage>
          </HTMLFlipBook>
        )}
      </div>

      {/* Bottom nav — accessible with page indicator and Edit button */}
      <div style={{
        display: 'flex', alignItems: 'stretch', flexShrink: 0,
        background: 'rgba(10,5,2,0.85)', borderTop: '1px solid rgba(255,255,255,0.07)',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        minHeight: 64,
      }}>
        {/* Prev */}
        <button
          onClick={() => bookRef.current?.pageFlip().flipPrev()}
          style={{
            flex: 1, background: 'none', border: 'none', cursor: 'pointer',
            color: '#fde68a', fontSize: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRight: '1px solid rgba(255,255,255,0.07)',
          }}
        >◄</button>

        {/* Center: page indicator + Edit */}
        <div style={{
          flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 4, padding: '8px 12px',
        }}>
          <span style={{ color: 'rgba(253,230,138,0.55)', fontSize: 11, letterSpacing: '0.04em' }}>
            {pages.length === 0
              ? 'Cover'
              : currentFlipPage === 0
                ? 'Cover'
                : currentFlipPage > pages.length
                  ? 'Back cover'
                  : `Page ${currentFlipPage} / ${pages.length}`
            }
          </span>
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

        {/* Next */}
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
