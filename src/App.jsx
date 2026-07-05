import { useState, useEffect } from 'react'
import AlbumsHome from './pages/AlbumsHome'
import BookView from './pages/BookView'
import { getAlbum } from './firebase/firestore'

// URL scheme:
//   #/                         → albums list
//   #/{albumId}                → book view
//   #/{albumId}/edit/{pageId}  → page editor

function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, '')
  if (!raw) return { view: 'albums' }
  const parts = raw.split('/')
  if (parts.length >= 3 && parts[1] === 'edit') {
    return { view: 'editor', albumId: parts[0], pageId: parts[2] }
  }
  return { view: 'album', albumId: parts[0] }
}

export default function App() {
  const [album, setAlbum] = useState(null)
  const [initialEditPageId, setInitialEditPageId] = useState(null)
  const [restoring, setRestoring] = useState(true)

  // On first load, restore navigation state from URL
  useEffect(() => {
    const { view, albumId, pageId } = parseHash()
    if (!albumId) { setRestoring(false); return }

    getAlbum(albumId)
      .then(a => {
        if (a) {
          setAlbum(a)
          if (pageId) setInitialEditPageId(pageId)
        } else {
          // Album deleted or invalid ID — reset URL
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
      } else if (view === 'album') {
        // Back to album view from editor — BookView handles closing the editor
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
  }

  function closeAlbum() {
    history.pushState({}, '', '#/')
    setAlbum(null)
    setInitialEditPageId(null)
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
        onEditorPageCleared={() => setInitialEditPageId(null)}
      />
    )
  }

  return <AlbumsHome onOpen={openAlbum} />
}
