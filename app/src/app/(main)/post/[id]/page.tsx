'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { BackIcon } from '@/components/icons'
import TweetCard from '@/components/TweetCard'
import { fetchComments, fetchPostById, type FeedPost, type PostEngagement } from '@/lib/posts'
import { useAuth } from '@/contexts/AuthContext'

const DEFAULT_AVATAR = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_bigger.png'

export default function PostPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const postId = params.id as string

  const [post, setPost] = useState<FeedPost | null>(null)
  const [parentPost, setParentPost] = useState<FeedPost | null>(null)
  const [parentEngagement, setParentEngagement] = useState<PostEngagement | undefined>(undefined)
  const [engagement, setEngagement] = useState<PostEngagement | undefined>(undefined)
  const [comments, setComments] = useState<FeedPost[]>([])
  const [commentMetrics, setCommentMetrics] = useState<Record<string, PostEngagement>>({})
  const [loading, setLoading] = useState(true)

  const loadPost = useCallback(async () => {
    setLoading(true)

    const { post: nextPost, engagement: nextEngagement } = await fetchPostById(postId, user?.id)
    const commentsTargetId = nextPost.originalPost?.id ?? nextPost.id
    const { posts: nextComments, engagementByPostId } = await fetchComments(commentsTargetId, user?.id)

    // If this post is a reply, fetch the parent for context
    if (nextPost.parent_post_id) {
      try {
        const { post: parent, engagement: parentEng } = await fetchPostById(nextPost.parent_post_id, user?.id)
        setParentPost(parent)
        setParentEngagement(parentEng)
      } catch {
        setParentPost(null)
        setParentEngagement(undefined)
      }
    } else {
      setParentPost(null)
      setParentEngagement(undefined)
    }

    setPost(nextPost)
    setEngagement(nextEngagement)
    setComments(nextComments)
    setCommentMetrics(engagementByPostId)
    setLoading(false)
  }, [postId, user])

  useEffect(() => {
    const run = async () => {
      await loadPost()
    }

    void run()
  }, [loadPost])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="py-20 text-center text-[15px] text-text-secondary">
        Publicação não encontrada.
      </div>
    )
  }

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border backdrop-blur-xl" style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}>
        <div className="flex items-center gap-6 px-4 h-[53px]">
          <button
            onClick={() => router.back()}
            className="w-[34px] h-[34px] flex items-center justify-center rounded-full hover:bg-white/10 transition-colors duration-150"
          >
            <BackIcon />
          </button>
          <h1 className="text-xl font-bold leading-tight">Publicação</h1>
        </div>
      </header>

      {parentPost && (
        <section className="border-b border-border">
          <Link href={`/post/${parentPost.id}`} className="block px-4 py-2 text-[13px] text-text-secondary hover:bg-white/[0.03] transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full overflow-hidden bg-bg-tertiary flex-shrink-0">
                <img src={parentPost.profiles.avatar_url || DEFAULT_AVATAR} alt="" className="w-full h-full object-cover" />
              </div>
              <span>
                Respondendo a <span className="text-accent">@{parentPost.profiles.username}</span>
              </span>
            </div>
          </Link>
          <div className="opacity-60">
            <TweetCard
              post={parentPost}
              engagement={parentEngagement}
              onUpdated={loadPost}
              compact
            />
          </div>
        </section>
      )}

      <section>
        <TweetCard
          post={post}
          engagement={engagement}
          onDeleted={() => {
            if (parentPost) {
              router.push(`/post/${parentPost.id}`)
            } else {
              router.push('/')
            }
          }}
          onUpdated={loadPost}
        />
      </section>

      <section>
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-[15px] font-bold">
            {comments.length > 0 ? `Respostas (${comments.length})` : 'Respostas'}
          </h2>
        </div>
        {comments.length > 0 ? (
          comments.map((comment) => (
            <TweetCard
              key={comment.id}
              post={comment}
              engagement={commentMetrics[comment.id]}
              onDeleted={loadPost}
              onUpdated={loadPost}
            />
          ))
        ) : (
          <div className="flex items-center justify-center py-14 text-[15px] text-text-secondary">
            Nenhuma resposta ainda.
          </div>
        )}
      </section>
    </>
  )
}
