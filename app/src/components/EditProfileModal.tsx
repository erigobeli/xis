'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { CloseIcon, CameraIcon } from './icons'

const DEFAULT_AVATAR = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_bigger.png'

interface EditProfileModalProps {
  onClose: () => void
  onSaved: () => void
}

export default function EditProfileModal({ onClose, onSaved }: EditProfileModalProps) {
  const { user, profile, refreshProfile } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp']

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Selecione um arquivo de imagem.')
      return
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase()
    if (!fileExt || !ALLOWED_EXTENSIONS.includes(fileExt)) {
      setError('Formato não suportado. Use JPG, PNG, GIF ou WebP.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter menos de 5MB.')
      return
    }

    setError(null)
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (!user || saving) return
    if (!fullName.trim()) {
      setError('O nome não pode ficar vazio.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      let avatarUrl = profile?.avatar_url ?? null

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const filePath = `${user.id}/avatar.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true })

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`)
        }

        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath)

        avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          avatar_url: avatarUrl,
        })
        .eq('id', user.id)

      if (updateError) {
        throw new Error(`Update failed: ${updateError.message}`)
      }

      await refreshProfile()
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo deu errado.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-start justify-center pt-[5vh] bg-bg-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-bg-primary rounded-2xl w-full max-w-[600px] shadow-[0_0_20px_rgba(255,255,255,0.1)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-5">
            <button
              onClick={onClose}
              className="w-[34px] h-[34px] flex items-center justify-center rounded-full hover:bg-white/10 transition-colors duration-150"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold">Editar perfil</h2>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !fullName.trim()}
            className="px-4 py-1.5 bg-text-primary text-bg-primary text-sm font-bold rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>

        {/* Banner placeholder */}
        <div className="h-[200px] bg-bg-banner" />

        {/* Avatar */}
        <div className="px-4 relative">
          <div className="relative -mt-[67px] w-fit">
            <div className="w-[112px] h-[112px] rounded-full border-4 border-bg-primary overflow-hidden bg-bg-tertiary">
              <img
                src={avatarPreview || DEFAULT_AVATAR}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/40 transition-colors"
            >
              <CameraIcon className="w-6 h-6 text-white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Form */}
        <div className="px-4 py-6 space-y-6">
          <div className="relative border border-border rounded-md px-3 pt-4 pb-2 focus-within:border-accent">
            <label className="absolute top-2 left-3 text-[13px] text-text-secondary">
              Nome
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={50}
              className="w-full text-[17px] bg-transparent outline-none"
            />
            <span className="absolute top-2 right-3 text-[13px] text-text-secondary">
              {fullName.length}/50
            </span>
          </div>

          {error && (
            <p className="text-danger text-sm">{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}
