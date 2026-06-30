import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, getDocs, orderBy, query, serverTimestamp,
} from 'firebase/firestore'
import { db } from './config'

export async function getAlbums() {
  const snap = await getDocs(query(collection(db, 'albums'), orderBy('createdAt', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function createAlbum(title) {
  const ref = await addDoc(collection(db, 'albums'), {
    title, coverUrl: null, createdAt: serverTimestamp(),
  })
  return { id: ref.id, title, coverUrl: null }
}

export async function updateAlbum(id, data) {
  return updateDoc(doc(db, 'albums', id), data)
}

export async function deleteAlbumWithPages(albumId) {
  const pagesSnap = await getDocs(collection(db, 'albums', albumId, 'pages'))
  await Promise.all(pagesSnap.docs.map(d => deleteDoc(d.ref)))
  await deleteDoc(doc(db, 'albums', albumId))
}

export async function getPages(albumId) {
  const snap = await getDocs(
    query(collection(db, 'albums', albumId, 'pages'), orderBy('order', 'asc'))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function addPage(albumId, order) {
  const ref = await addDoc(collection(db, 'albums', albumId, 'pages'), {
    order, elements: [], background: '#fffdf8', createdAt: serverTimestamp(),
  })
  return { id: ref.id, order, elements: [], background: '#fffdf8' }
}

export async function updatePage(albumId, pageId, data) {
  return updateDoc(doc(db, 'albums', albumId, 'pages', pageId), {
    ...data, updatedAt: serverTimestamp(),
  })
}

export async function deletePage(albumId, pageId) {
  return deleteDoc(doc(db, 'albums', albumId, 'pages', pageId))
}
