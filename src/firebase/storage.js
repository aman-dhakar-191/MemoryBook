export function uploadPhoto(file, onProgress, folder) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', uploadPreset)
    if (folder) formData.append('folder', folder)

    const xhr = new XMLHttpRequest()
    const timeoutId = setTimeout(() => xhr.abort(), 60000)
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`)

    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress?.((e.loaded / e.total) * 100)
    }

    xhr.onload = () => {
      clearTimeout(timeoutId)
      if (xhr.status === 200) {
        try {
          const data = JSON.parse(xhr.responseText)
          resolve({ url: data.secure_url, path: data.public_id })
        } catch {
          reject(new Error('Invalid response from server'))
        }
      } else if (xhr.status === 413) {
        reject(new Error('File too large'))
      } else {
        reject(new Error(`Upload failed (HTTP ${xhr.status})`))
      }
    }

    xhr.onerror = () => { clearTimeout(timeoutId); reject(new Error('Network error during upload')) }
    xhr.onabort = () => { clearTimeout(timeoutId); reject(new Error('Upload cancelled')) }
    xhr.ontimeout = () => { clearTimeout(timeoutId); reject(new Error('Upload timed out — connection too slow')) }
    xhr.send(formData)
  })
}

// Cloudinary unsigned deletes require server-side auth — photos are orphaned
// when a memory is deleted but storage cost is negligible for personal use.
export async function deletePhoto(_publicId) {}
