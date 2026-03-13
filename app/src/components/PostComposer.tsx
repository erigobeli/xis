'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { MediaIcon } from './icons'

const DEFAULT_AVATAR = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_bigger.png'

interface PostComposerProps {
  onPostCreated?: () => void
}

export default function PostComposer({ onPostCreated }: PostComposerProps) {
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
      setContent('')
      onPostCreated?.()
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
          onChange={(e) => setContent(e.target.value)}
          placeholder="O que está acontecendo?"
          rows={1}
          className="w-full text-xl placeholder:text-text-secondary min-h-[52px] py-3 resize-none"
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement
            target.style.height = 'auto'
            target.style.height = target.scrollHeight + 'px'
          }}
        />
        <div className="flex justify-between items-center pt-3 border-t border-border">
          <div className="flex gap-1">
            <button className="w-[34px] h-[34px] flex items-center justify-center rounded-full hover:bg-accent/10 text-accent transition-colors">
              <MediaIcon />
            </button>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || posting}
            className="bg-accent hover:bg-accent-hover text-white font-bold text-sm px-4 py-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {posting ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </div>
    </div>
  )
}
