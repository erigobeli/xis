'use client'

import { useEffect, useState, useCallback } from 'react'
import PostComposer from '@/components/PostComposer'
import TweetCard from '@/components/TweetCard'
import { useAuth } from '@/contexts/AuthContext'
import { fetchFeedPosts, type FeedPost, type PostEngagement } from '@/lib/posts'

export default function HomePage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [engagementByPostId, setEngagementByPostId] = useState<Record<string, PostEngagement>>({})

  const fetchPosts = useCallback(async () => {
    const { posts: nextPosts, engagementByPostId: nextEngagement } = await fetchFeedPosts(user?.id)
    setPosts(nextPosts)
    setEngagementByPostId(nextEngagement)
  }, [user?.id])

  useEffect(() => {
    const run = async () => {
      await fetchPosts()
    }

    void run()
  }, [fetchPosts])

  return (
    <>
      {/* Feed Header */}
      <header className="sticky top-0 z-10 backdrop-blur-xl border-b border-border" style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}>
        <div className="flex items-center justify-center py-4">
          <h1 className="text-[17px] font-bold">Início</h1>
        </div>
      </header>

      {/* Composer */}
      <PostComposer onPostCreated={fetchPosts} />

      {/* Feed */}
      <section>
        {posts.map((post) => (
          <TweetCard
            key={post.id}
            post={post}
            engagement={engagementByPostId[post.originalPost?.id ?? post.id]}
            onDeleted={fetchPosts}
            onUpdated={fetchPosts}
          />
        ))}
        {posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-text-secondary text-[15px] px-4 text-center">
            <p className="font-bold text-text-primary text-xl mb-2">Bem-vindo!</p>
            <p>Siga pessoas para ver os posts delas aqui, ou crie seu primeiro post.</p>
          </div>
        )}
      </section>
    </>
  )
}
