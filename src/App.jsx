import { useState } from 'react'
import AlbumsHome from './pages/AlbumsHome'
import BookView from './pages/BookView'

export default function App() {
  const [album, setAlbum] = useState(null)

  if (album) {
    return (
      <BookView
        album={album}
        onBack={() => setAlbum(null)}
        onAlbumUpdate={setAlbum}
      />
    )
  }

  return <AlbumsHome onOpen={setAlbum} />
}
