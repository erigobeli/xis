'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { CloseIcon, MediaIcon } from './icons'

const DEFAULT_AVATAR = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_bigger.png'

interface PostModalProps {
  onClose: () => void
  onPostCreated: () => void
}

export default function PostModal({ onClose, onPostCreated }: PostModalProps) {
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const { user, profile } = useAuth()

  const handleSubmit = async () => {
    if (!content.trim() || !user || posting) return

    setPosting(true)
    const { error } = await supabase
      .from('posts')
      .insert({ content: content.trim(), user_id: user.id })

    if (!error) {
      onPostCreated()
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
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="O que está acontecendo?"
              className="flex-1 text-xl min-h-[120px] w-full pt-2 placeholder:text-text-secondary resize-none"
              autoFocus
            />
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
            <button className="w-[34px] h-[34px] flex items-center justify-center rounded-full text-accent hover:bg-accent/10 transition-colors">
              <MediaIcon className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || posting}
            className={`px-4 py-2 bg-accent text-white text-sm font-bold rounded-full hover:bg-accent-hover transition-colors ${!content.trim() ? 'opacity-50' : 'opacity-100'}`}
          >
            {posting ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </div>
    </div>
  )
}
