import { useState, useEffect } from 'react'
import AlbumsHome from './pages/AlbumsHome'
import BookView from './pages/BookView'
import { getAlbum } from './firebase/firestore'

// URL scheme:
//   #/                            → albums list
//   #/{albumId}                   → book view (cover)
//   #/{albumId}/{pageIndex}       → book view (page N)
//   #/{albumId}/edit/{pageId}     → page editor

function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, '')
  if (!raw) return { view: 'albums' }
  const parts = raw.split('/')
  if (parts.length >= 3 && parts[1] === 'edit') {
    return { view: 'editor', albumId: parts[0], pageId: parts[2] }
  }
  const n = parts[1] !== undefined ? parseInt(parts[1], 10) : NaN
  const pageIndex = !isNaN(n) && n >= 0 ? n : 0
  return { view: 'album', albumId: parts[0], pageIndex }
}

export default function App() {
  const [album, setAlbum] = useState(null)
  const [initialEditPageId, setInitialEditPageId] = useState(null)
  const [initialPageIndex, setInitialPageIndex] = useState(0)
  const [restoring, setRestoring] = useState(true)

  // On first load, restore navigation state from URL
  useEffect(() => {
    const { view, albumId, pageId, pageIndex } = parseHash()
    if (!albumId) { setRestoring(false); return }

    getAlbum(albumId)
      .then(a => {
        if (a) {
          setAlbum(a)
          if (pageId) setInitialEditPageId(pageId)
          if (pageIndex) setInitialPageIndex(pageIndex)
        } else {
          history.replaceState({}, '', '#/')
        }
      })
      .catch(() => history.replaceState({}, '', '#/'))
      .finally(() => setRestoring(false))
  }, [])

  // Android hardware back button / browser back
  useEffect(() => {
    const onPop = () => {
      const { view, albumId } = parseHash()
      if (view === 'albums') {
        setAlbum(null)
        setInitialEditPageId(null)
        setInitialPageIndex(0)
      } else if (view === 'album') {
        setInitialEditPageId(null)
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  function openAlbum(a) {
    history.pushState({ albumId: a.id }, '', `#/${a.id}`)
    setAlbum(a)
    setInitialEditPageId(null)
    setInitialPageIndex(0)
  }

  function closeAlbum() {
    history.pushState({}, '', '#/')
    setAlbum(null)
    setInitialEditPageId(null)
    setInitialPageIndex(0)
  }

  function updateAlbum(a) {
    setAlbum(a)
  }

  if (restoring) {
    return (
      <div style={{ height: '100dvh', background: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#444', fontSize: 13 }}>Loading…</p>
      </div>
    )
  }

  if (album) {
    return (
      <BookView
        album={album}
        onBack={closeAlbum}
        onAlbumUpdate={updateAlbum}
        initialEditPageId={initialEditPageId}
        initialPageIndex={initialPageIndex}
        onEditorPageCleared={() => setInitialEditPageId(null)}
      />
    )
  }

  return <AlbumsHome onOpen={openAlbum} />
}
