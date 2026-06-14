import React, { useRef, useState, useEffect } from 'react'
import HTMLFlipBook from 'react-pageflip'
import { getPages, addPage } from '../firebase/firestore'
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

export default function BookView({ album, onBack }) {
  const bookRef = useRef()
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingPage, setEditingPage] = useState(null)

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
    <div className="h-screen flex flex-col" style={{ background: '#1a0f08' }}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 py-3 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <button
          onClick={onBack}
          className="text-sm transition-colors"
          style={{ color: '#fbbf24' }}
        >
          ← Albums
        </button>
        <h2
          className="font-semibold"
          style={{ fontFamily: 'Playfair Display, serif', color: '#fde68a' }}
        >
          {album.title}
        </h2>
        <button
          onClick={handleAddPage}
          className="text-xs px-3 py-1.5 rounded-lg transition-colors"
          style={{ background: 'rgba(180,120,60,0.35)', color: '#fde68a', border: '1px solid rgba(180,120,60,0.4)' }}
        >
          + Add Page
        </button>
      </div>

      {/* Book */}
      <div className="flex-1 flex items-center justify-center overflow-hidden py-6">
        {loading ? (
          <p style={{ color: 'rgba(253,230,138,0.4)' }}>Loading pages…</p>
        ) : (
          <HTMLFlipBook
            key={pages.length}
            ref={bookRef}
            width={PAGE_W}
            height={PAGE_H}
            size="fixed"
            showCover
            flippingTime={650}
            usePortrait={false}
            drawShadow
            maxShadowOpacity={0.6}
            style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.8)' }}
          >
            {/* Front cover */}
            <FlipPage
              style={{
                background: '#7c3a1e',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: 14,
                  background: 'rgba(0,0,0,0.4)',
                }}
              />
              {album.coverUrl ? (
                <img
                  src={album.coverUrl}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <div style={{ fontSize: 60, marginBottom: 28 }}>📖</div>
                  <h2
                    style={{
                      fontFamily: 'Playfair Display, serif',
                      fontSize: 28,
                      color: '#fde68a',
                      marginBottom: 12,
                    }}
                  >
                    {album.title}
                  </h2>
                  <div
                    style={{
                      width: 50, height: 2,
                      background: 'rgba(253,230,138,0.35)',
                      margin: '0 auto',
                    }}
                  />
                </div>
              )}
            </FlipPage>

            {/* Content pages */}
            {pages.length === 0 ? (
              <FlipPage
                style={{
                  background: '#fffdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ textAlign: 'center', color: '#bbb' }}>
                  <p style={{ fontSize: 13 }}>No pages yet</p>
                  <p style={{ fontSize: 11, marginTop: 4 }}>Click “+ Add Page” to start</p>
                </div>
              </FlipPage>
            ) : (
              pages.map((page, i) => (
                <FlipPage
                  key={page.id}
                  style={{ background: page.background || '#fffdf8', position: 'relative' }}
                >
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
              <div
                style={{
                  position: 'absolute', right: 0, top: 0, bottom: 0, width: 14,
                  background: 'rgba(0,0,0,0.4)',
                }}
              />
            </FlipPage>
          </HTMLFlipBook>
        )}
      </div>

      {/* Nav */}
      <div className="flex items-center justify-center gap-6 pb-7 shrink-0">
        <button
          onClick={() => bookRef.current?.pageFlip().flipPrev()}
          className="px-8 py-2 rounded-full text-sm transition-colors"
          style={{
            background: 'rgba(120,70,30,0.4)',
            color: '#fde68a',
            border: '1px solid rgba(180,120,60,0.3)',
          }}
        >
          ◄ Prev
        </button>
        <button
          onClick={() => bookRef.current?.pageFlip().flipNext()}
          className="px-8 py-2 rounded-full text-sm transition-colors"
          style={{
            background: 'rgba(120,70,30,0.4)',
            color: '#fde68a',
            border: '1px solid rgba(180,120,60,0.3)',
          }}
        >
          Next ►
        </button>
      </div>
    </div>
  )
}
