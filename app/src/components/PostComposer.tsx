'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { MediaIcon } from './icons'
import { createPost } from '@/lib/posts'

const DEFAULT_AVATAR = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_bigger.png'
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp']
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

interface PostComposerProps {
  onPostCreated?: () => void
}

export default function PostComposer({ onPostCreated }: PostComposerProps) {
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
      onPostCreated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível publicar.')
    }
    setPosting(false)
  }

  return (
    <div className="flex gap-3 px-4 py-4 border-b border-border">
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
          rows={1}
          className="w-full text-xl placeholder:text-text-secondary min-h-[52px] py-3 resize-none"
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement
            target.style.height = 'auto'
            target.style.height = target.scrollHeight + 'px'
          }}
        />
        {imagePreview && (
          <div className="mt-3 relative overflow-hidden rounded-2xl border border-border bg-bg-secondary">
            <img src={imagePreview} alt="Preview da imagem selecionada" className="max-h-[360px] w-full object-cover" />
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
        <div className="flex justify-between items-center pt-3 border-t border-border">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-[34px] h-[34px] flex items-center justify-center rounded-full hover:bg-accent/10 text-accent transition-colors"
            >
              <MediaIcon />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={posting || (!content.trim() && !imageFile)}
            className="bg-accent hover:bg-accent-hover text-white font-bold text-sm px-4 py-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {posting ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </div>
    </div>
  )
}
