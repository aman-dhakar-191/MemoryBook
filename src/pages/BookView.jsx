import React, { useRef, useState, useEffect, useCallback } from 'react'
import HTMLFlipBook from 'react-pageflip'
import { useDropzone } from 'react-dropzone'
import { getPages, addPage, updateAlbum } from '../firebase/firestore'
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

export default function BookView({ album, onBack, onAlbumUpdate }) {
  const bookRef = useRef()
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingPage, setEditingPage] = useState(null)
  const [coverUrl, setCoverUrl] = useState(album.coverUrl || null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 700)

  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 700)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  useEffect(() => {
    getPages(album.id).then(setPages).finally(() => setLoading(false))
  }, [album.id])

  async function handleAddPage() {
    const page = await addPage(album.id, pages.length)
    setPages(prev => [...prev, page])
  }

  function handlePageSaved(updated) {
    setPages(prev => prev.map(p => p.id === updated.id ? updated : p))
    setEditingPage(null)
  }

  const onCoverDrop = useCallback(async accepted => {
    const file = accepted[0]
    if (!file) return
    setUploadingCover(true)
    try {
      const { url } = await uploadPhoto(file)
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

  if (editingPage) {
    return (
      <PageEditor
        album={album}
        page={editingPage}
        onSave={handlePageSaved}
        onCancel={() => setEditingPage(null)}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
        <button
          onClick={handleAddPage}
          style={{
            fontSize: 11, color: '#fde68a',
            background: 'rgba(180,120,60,0.35)',
            border: '1px solid rgba(180,120,60,0.4)',
            borderRadius: 6, padding: '5px 11px', cursor: 'pointer',
          }}
        >
          + Add Page
        </button>
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
          >
            {/* Front cover */}
            <FlipPage style={{ background: '#7c3a1e', position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 14, background: 'rgba(0,0,0,0.4)', zIndex: 1 }} />
              {coverUrl ? (
                <img src={coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 32px 32px', color: 'rgba(255,220,150,0.7)' }}>
                  <div style={{ fontSize: 56, marginBottom: 24 }}>📖</div>
                  <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, color: '#fde68a', marginBottom: 16 }}>
                    {album.title}
                  </h2>
                  <div style={{ width: 48, height: 2, background: 'rgba(253,230,138,0.3)', margin: '0 auto 28px' }} />
                  <button
                    onClick={openCoverPicker}
                    style={{
                      fontSize: 13, color: '#fde68a',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(253,230,138,0.3)',
                      borderRadius: 10, padding: '10px 20px',
                      cursor: 'pointer', width: '100%',
                    }}
                  >
                    {uploadingCover ? 'Uploading…' : '+ Set Cover Photo'}
                  </button>
                </div>
              )}
            </FlipPage>

            {/* Content pages */}
            {pages.length === 0 ? (
              <FlipPage style={{ background: '#fffdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: '#bbb' }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>✨</div>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>No pages yet</p>
                  <p style={{ fontSize: 11, marginTop: 4 }}>Tap “+ Add Page” to start</p>
                </div>
              </FlipPage>
            ) : (
              pages.map((page, i) => (
                <FlipPage key={page.id} style={{ background: page.background || '#fffdf8', position: 'relative' }}>
                  <BookPage
                    page={page}
                    pageNumber={i + 1}
                    canvasW={PAGE_W}
                    canvasH={PAGE_H}
                    onEdit={() => setEditingPage(page)}
                  />
                </FlipPage>
              ))
            )}

            {/* Back cover */}
            <FlipPage style={{ background: '#5c2d0e', position: 'relative' }}>
              <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 14, background: 'rgba(0,0,0,0.4)' }} />
            </FlipPage>
          </HTMLFlipBook>
        )}
      </div>

      {/* Nav buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, padding: '12px 0 20px', flexShrink: 0 }}>
        <button
          onClick={() => bookRef.current?.pageFlip().flipPrev()}
          style={{
            background: 'rgba(120,70,30,0.4)', color: '#fde68a',
            border: '1px solid rgba(180,120,60,0.3)',
            borderRadius: 24, padding: '9px 28px', fontSize: 13, cursor: 'pointer',
          }}
        >◄ Prev</button>
        <button
          onClick={() => bookRef.current?.pageFlip().flipNext()}
          style={{
            background: 'rgba(120,70,30,0.4)', color: '#fde68a',
            border: '1px solid rgba(180,120,60,0.3)',
            borderRadius: 24, padding: '9px 28px', fontSize: 13, cursor: 'pointer',
          }}
        >Next ►</button>
      </div>
    </div>
  )
}
