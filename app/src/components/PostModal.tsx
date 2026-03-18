'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { CloseIcon, MediaIcon } from './icons'
import { createPost } from '@/lib/posts'

const DEFAULT_AVATAR = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_bigger.png'
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp']
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

interface PostModalProps {
  onClose: () => void
  onPostCreated: () => void
}

export default function PostModal({ onClose, onPostCreated }: PostModalProps) {
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user, profile } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  const resetImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Selecione um arquivo de imagem.')
      event.target.value = ''
      return
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase()
    if (!fileExt || !ALLOWED_EXTENSIONS.includes(fileExt)) {
      setError('Formato não suportado. Use JPG, PNG, GIF ou WebP.')
      event.target.value = ''
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError('A imagem deve ter menos de 5MB.')
      event.target.value = ''
      return
    }

    setError(null)
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    if (!user || posting) return
    if (!content.trim() && !imageFile) {
      setError('Escreva algo ou selecione uma imagem.')
      return
    }

    setPosting(true)

    try {
      await createPost({
        content,
        userId: user.id,
        imageFile,
      })
      setContent('')
      resetImage()
      setError(null)
      onPostCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível publicar.')
    }
    setPosting(false)
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-start justify-center pt-[5vh] bg-bg-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-bg-primary rounded-2xl w-full max-w-[600px] shadow-[0_0_20px_rgba(255,255,255,0.1)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2">
          <button
            onClick={onClose}
            className="w-[34px] h-[34px] flex items-center justify-center rounded-full hover:bg-white/10 transition-colors duration-150"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
          <button className="text-accent text-sm font-bold px-4 py-2 rounded-full hover:bg-accent/10 transition-colors">
            Rascunhos
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-bg-tertiary">
              <img src={profile?.avatar_url || DEFAULT_AVATAR} alt="Your avatar" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <textarea
                value={content}
                onChange={(e) => {
                  setContent(e.target.value)
                  if (error) setError(null)
                }}
                placeholder="O que está acontecendo?"
                className="flex-1 text-xl min-h-[120px] w-full pt-2 placeholder:text-text-secondary resize-none"
                autoFocus
              />
              {imagePreview && (
                <div className="mt-3 relative overflow-hidden rounded-2xl border border-border bg-bg-secondary">
                  <img src={imagePreview} alt="Preview da imagem selecionada" className="max-h-[420px] w-full object-cover" />
                  <button
                    type="button"
                    onClick={resetImage}
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black/85"
                    aria-label="Remover imagem"
                  >
                    <span className="text-lg leading-none">×</span>
                  </button>
                </div>
              )}
              {error && (
                <p className="mt-3 text-sm text-red-400">{error}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-accent text-sm font-bold py-2 pl-[52px] border-b border-border mb-3">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-accent">
              <path d="M12 1.75C6.34 1.75 1.75 6.34 1.75 12S6.34 22.25 12 22.25 22.25 17.66 22.25 12 17.66 1.75 12 1.75zm-.25 10.48L10.5 17.5l-2-1.5 1.75-7.75 4.25 2z" />
            </svg>
            <span>Todos podem responder</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 pb-4">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-[34px] h-[34px] flex items-center justify-center rounded-full text-accent hover:bg-accent/10 transition-colors"
            >
              <MediaIcon className="w-5 h-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={posting || (!content.trim() && !imageFile)}
            className={`px-4 py-2 bg-accent text-white text-sm font-bold rounded-full hover:bg-accent-hover transition-colors ${(content.trim() || imageFile) ? 'opacity-100' : 'opacity-50'}`}
          >
            {posting ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </div>
    </div>
  )
}
