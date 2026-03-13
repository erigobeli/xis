'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { BackIcon, CalendarIcon } from '@/components/icons'
import TweetCard from '@/components/TweetCard'
import EditProfileModal from '@/components/EditProfileModal'
import { useAuth } from '@/contexts/AuthContext'
import { fetchFeedPosts, type FeedPost, type PostEngagement } from '@/lib/posts'
import { getFollowCounts, isFollowing as checkIsFollowing, followUser, unfollowUser } from '@/lib/follows'

const DEFAULT_AVATAR = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_bigger.png'

interface Profile {
  id: string
  username: string
  full_name: string
  avatar_url: string | null
  created_at: string
}

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string
  const { user } = useAuth()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [engagementByPostId, setEngagementByPostId] = useState<Record<string, PostEngagement>>({})
  const [postCount, setPostCount] = useState(0)
  const [showEditModal, setShowEditModal] = useState(false)
  const [followingCount, setFollowingCount] = useState(0)
  const [followersCount, setFollowersCount] = useState(0)
  const [isFollowed, setIsFollowed] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const isOwnProfile = user?.id === userId

  const fetchData = useCallback(async () => {
    const [profileRes, feedRes, counts] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      fetchFeedPosts(user?.id, userId),
      getFollowCounts(userId),
    ])

    if (profileRes.data) setProfile(profileRes.data)
    setPosts(feedRes.posts)
    setEngagementByPostId(feedRes.engagementByPostId)
    setPostCount(feedRes.posts.length)
    setFollowingCount(counts.followingCount)
    setFollowersCount(counts.followersCount)

    if (user && user.id !== userId) {
      const followed = await checkIsFollowing(user.id, userId)
      setIsFollowed(followed)
    }
  }, [user, userId])

  useEffect(() => {
    const run = async () => {
      await fetchData()
    }

    void run()
  }, [fetchData])

  const handleDeleteAccount = async () => {
    if (!user || deleteLoading) return

    const accepted = confirm(
      'Excluir sua conta?\n\nTodos os seus posts serao deletados e essa acao nao pode ser desfeita.'
    )

    if (!accepted) return

    setDeleteError('')
    setDeleteLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('Sua sessao expirou. Entre novamente para excluir a conta.')
      }

      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(result?.error || 'Nao foi possivel excluir a conta.')
      }

      await supabase.auth.signOut()
      router.replace('/login')
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Nao foi possivel excluir a conta.')
    } finally {
      setDeleteLoading(false)
    }
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const joinedDate = new Date(profile.created_at).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <>
      {/* Profile Header */}
      <header className="sticky top-0 z-10 border-b border-border backdrop-blur-xl" style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}>
        <div className="flex items-center gap-6 px-4 h-[53px]">
          <button
            onClick={() => router.back()}
            className="w-[34px] h-[34px] flex items-center justify-center rounded-full hover:bg-white/10 transition-colors duration-150"
          >
            <BackIcon />
          </button>
          <div>
            <h1 className="text-xl font-bold leading-tight">{profile.full_name}</h1>
            <p className="text-[13px] text-text-secondary">{postCount} publicações</p>
          </div>
        </div>
      </header>

      {/* Banner */}
      <div className="h-[200px] bg-bg-banner relative" />

      {/* Profile Info */}
      <section className="px-4 pb-3 relative">
        {/* Avatar */}
        <div className="relative -mt-[67px]">
          <div className="w-[133px] h-[133px] rounded-full border-4 border-bg-primary overflow-hidden bg-bg-tertiary">
            <img src={profile.avatar_url || DEFAULT_AVATAR} alt={`${profile.full_name} avatar`} className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Edit profile / Follow button */}
        <div className="absolute top-3 right-4">
          {isOwnProfile ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 border border-border text-text-primary text-sm font-bold rounded-full hover:bg-white/10 transition-colors duration-150"
              >
                Editar perfil
              </button>
              <button
                onClick={() => void handleDeleteAccount()}
                disabled={deleteLoading}
                className="px-4 py-2 border border-red-500/60 text-red-400 text-sm font-bold rounded-full hover:bg-red-500/10 transition-colors duration-150 disabled:opacity-50"
              >
                {deleteLoading ? 'Excluindo...' : 'Excluir conta'}
              </button>
            </div>
          ) : (
            <button
              disabled={followLoading}
              onClick={async () => {
                setFollowLoading(true)
                try {
                  if (isFollowed) {
                    await unfollowUser(userId)
                  } else {
                    await followUser(userId)
                  }
                  await fetchData()
                } finally {
                  setFollowLoading(false)
                }
              }}
              className={`px-4 py-2 text-sm font-bold rounded-full transition-colors duration-150 ${
                isFollowed
                  ? 'border border-border text-text-primary hover:border-red-500 hover:text-red-500 group'
                  : 'bg-text-primary text-bg-primary hover:opacity-85'
              }`}
            >
              {isFollowed ? (
                <>
                  <span className="group-hover:hidden">Seguindo</span>
                  <span className="hidden group-hover:inline">Deixar de seguir</span>
                </>
              ) : (
                'Seguir'
              )}
            </button>
          )}
        </div>

        {/* Name */}
        <h2 className="text-xl font-extrabold mt-1">{profile.full_name}</h2>
        <span className="text-[15px] text-text-secondary">@{profile.username}</span>

        {/* Joined */}
        <div className="flex items-center gap-1 mt-3 text-[15px] text-text-secondary">
          <CalendarIcon className="w-[18px] h-[18px]" />
          <span>Ingressou em {joinedDate}</span>
        </div>

        {/* Stats */}
        <div className="flex gap-5 mt-3">
          <span className="flex gap-1 text-sm text-text-secondary">
            <span className="text-text-primary font-bold">{followingCount}</span>
            <span>Seguindo</span>
          </span>
          <span className="flex gap-1 text-sm text-text-secondary">
            <span className="text-text-primary font-bold">{followersCount}</span>
            <span>Seguidores</span>
          </span>
        </div>

        {isOwnProfile && (
          <p className="mt-4 text-sm text-text-secondary">
            Ao excluir a conta, todos os seus posts serao deletados permanentemente.
          </p>
        )}

        {deleteError && (
          <p className="mt-2 text-sm text-red-400">{deleteError}</p>
        )}
      </section>

      {/* Profile Tabs */}
      <div className="flex border-b border-border mt-4">
        <button className="flex-1 flex items-center justify-center py-4 text-[15px] font-bold hover:bg-white/10 transition-colors duration-150 relative cursor-pointer">
          Publicações
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-accent rounded-full" />
        </button>
        <button className="flex-1 flex items-center justify-center py-4 text-[15px] text-text-secondary font-medium hover:bg-white/10 transition-colors duration-150 cursor-pointer">
          Respostas
        </button>
      </div>

      {/* Posts */}
      <section>
        {posts.map((post) => (
          <TweetCard
            key={post.id}
            post={post}
            engagement={engagementByPostId[post.originalPost?.id ?? post.id]}
            onDeleted={fetchData}
            onUpdated={fetchData}
          />
        ))}
        {posts.length === 0 && (
          <div className="flex items-center justify-center min-h-[300px] text-text-secondary text-[15px]">
            Nenhuma publicação ainda.
          </div>
        )}
      </section>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <EditProfileModal
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false)
            fetchData()
          }}
        />
      )}
    </>
  )
}
