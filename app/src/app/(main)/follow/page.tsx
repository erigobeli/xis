'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { BackIcon } from '@/components/icons'
import { useAuth } from '@/contexts/AuthContext'
import { getFollowingProfiles, unfollowUser, type FollowedProfile } from '@/lib/follows'
import { supabase } from '@/lib/supabase'

const DEFAULT_AVATAR = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_bigger.png'

interface UserProfile {
  id: string
  username: string
  full_name: string
  avatar_url: string | null
}

export default function FollowPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [following, setFollowing] = useState<FollowedProfile[]>([])
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [suggestions, setSuggestions] = useState<UserProfile[]>([])
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'following' | 'suggestions'>('following')
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchData = useCallback(async () => {
    if (!user) return

    const followedProfiles = await getFollowingProfiles(user.id)
    setFollowing(followedProfiles)
    const ids = new Set(followedProfiles.map((p) => p.id))
    setFollowingIds(ids)

    const followedIds = followedProfiles.map((p) => p.id)
    let query = supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .neq('id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (followedIds.length > 0) {
      query = query.not('id', 'in', `(${followedIds.join(',')})`)
    }

    const { data } = await query
    setSuggestions(data ?? [])
  }, [user])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const handleSearch = useCallback(async (query: string) => {
    if (!user || !query.trim()) {
      setSearchResults([])
      return
    }

    const term = query.trim()
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .neq('id', user.id)
      .or(`username.ilike.%${term}%,full_name.ilike.%${term}%`)
      .order('created_at', { ascending: false })
      .limit(20)

    setSearchResults(data ?? [])
  }, [user])

  const onSearchChange = (value: string) => {
    setSearchQuery(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => handleSearch(value), 300)
  }

  const handleFollow = async (userId: string) => {
    if (!user) return
    setLoadingId(userId)
    try {
      await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: userId })
      await fetchData()
      if (searchQuery) await handleSearch(searchQuery)
    } finally {
      setLoadingId(null)
    }
  }

  const handleUnfollow = async (userId: string) => {
    setLoadingId(userId)
    try {
      await unfollowUser(userId)
      await fetchData()
      if (searchQuery) await handleSearch(searchQuery)
    } finally {
      setLoadingId(null)
    }
  }

  const displayedSuggestions = searchQuery.trim() ? searchResults : suggestions

  const renderUserRow = (profile: UserProfile) => {
    const isFollowed = followingIds.has(profile.id)
    return (
      <div
        key={profile.id}
        className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors duration-150 cursor-pointer"
        onClick={() => router.push(`/profile/${profile.id}`)}
      >
        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-bg-tertiary">
          <img src={profile.avatar_url || DEFAULT_AVATAR} alt={profile.full_name} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-bold text-[15px] truncate block">{profile.full_name}</span>
          <span className="text-[15px] text-text-secondary">@{profile.username}</span>
        </div>
        {isFollowed ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleUnfollow(profile.id)
            }}
            disabled={loadingId === profile.id}
            className="px-4 py-2 border border-border text-text-primary text-sm font-bold rounded-full hover:border-red-500 hover:text-red-500 transition-colors flex-shrink-0 group"
          >
            <span className="group-hover:hidden">Seguindo</span>
            <span className="hidden group-hover:inline">Deixar de seguir</span>
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleFollow(profile.id)
            }}
            disabled={loadingId === profile.id}
            className="px-4 py-2 bg-text-primary text-bg-primary text-sm font-bold rounded-full hover:opacity-85 transition-opacity flex-shrink-0"
          >
            Seguir
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border backdrop-blur-xl" style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}>
        <div className="flex items-center gap-6 px-4 h-[53px]">
          <button
            onClick={() => router.back()}
            className="w-[34px] h-[34px] flex items-center justify-center rounded-full hover:bg-white/10 transition-colors duration-150"
          >
            <BackIcon />
          </button>
          <h1 className="text-xl font-bold">Seguir</h1>
        </div>
        <div className="flex">
          <button
            onClick={() => setActiveTab('following')}
            className={`flex-1 flex items-center justify-center py-3 text-[15px] font-medium hover:bg-white/10 transition-colors duration-150 relative cursor-pointer ${activeTab === 'following' ? 'font-bold text-text-primary' : 'text-text-secondary'}`}
          >
            Seguindo
            {activeTab === 'following' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-accent rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`flex-1 flex items-center justify-center py-3 text-[15px] font-medium hover:bg-white/10 transition-colors duration-150 relative cursor-pointer ${activeTab === 'suggestions' ? 'font-bold text-text-primary' : 'text-text-secondary'}`}
          >
            Encontrar pessoas
            {activeTab === 'suggestions' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-accent rounded-full" />
            )}
          </button>
        </div>
      </header>

      <section className="flex flex-col">
        {activeTab === 'following' && (
          <>
            {following.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <h2 className="text-xl font-bold mb-2">Você ainda não segue ninguém</h2>
                <p className="text-text-secondary text-[15px]">Vá em Encontrar pessoas para descobrir quem seguir.</p>
              </div>
            ) : (
              following.map((profile) => renderUserRow(profile))
            )}
          </>
        )}

        {activeTab === 'suggestions' && (
          <>
            {/* Search bar */}
            <div className="px-4 py-3">
              <div className="relative">
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-text-secondary absolute left-3 top-1/2 -translate-y-1/2">
                  <path d="M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781c-1.447 1.142-3.276 1.824-5.262 1.824-4.694 0-8.5-3.806-8.5-8.5z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Buscar por nome ou username"
                  className="w-full bg-bg-tertiary rounded-full py-2.5 pl-10 pr-4 text-[15px] text-text-primary placeholder:text-text-secondary outline-none border border-transparent focus:border-accent focus:bg-transparent transition-colors"
                />
              </div>
            </div>

            {displayedSuggestions.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-text-secondary text-[15px]">
                {searchQuery.trim() ? 'Nenhum usuário encontrado.' : 'Nenhuma sugestão disponível.'}
              </div>
            ) : (
              <>
                {!searchQuery.trim() && (
                  <h2 className="text-[15px] font-bold px-4 py-2 text-text-secondary">Sugestões para você</h2>
                )}
                {displayedSuggestions.map((profile) => renderUserRow(profile))}
              </>
            )}
          </>
        )}
      </section>
    </>
  )
}
