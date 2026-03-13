'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ReplyIcon, RetweetIcon, LikeIcon, MoreIcon } from './icons'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { fetchComments, type FeedPost, type PostEngagement } from '@/lib/posts'

const DEFAULT_AVATAR = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_bigger.png'

const EMPTY_ENGAGEMENT: PostEngagement = {
  replyCount: 0,
  repostCount: 0,
  likeCount: 0,
  likedByMe: false,
  repostedByMe: false,
}

interface TweetCardProps {
  post: FeedPost
  engagement?: PostEngagement
  onDeleted?: () => void | Promise<void>
  onUpdated?: () => void | Promise<void>
  compact?: boolean
  depth?: number
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours < 24) {
    const h = Math.floor(diffHours)
    if (h < 1) {
      const m = Math.floor(diffMs / (1000 * 60))
      return m < 1 ? 'agora' : `${m}m`
    }
    return `${h}h`
  }

  return date.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })
}

function formatCount(value: number) {
  return value > 0 ? value.toLocaleString('pt-BR') : ''
}

const MAX_INLINE_DEPTH = 3

export default function TweetCard({ post, engagement, onDeleted, onUpdated, compact = false, depth = 0 }: TweetCardProps) {
  const router = useRouter()
  const { user, profile: currentProfile } = useAuth()
  const targetPost = post.originalPost ?? post
  const isOwner = user?.id === post.user_id

  const [metrics, setMetrics] = useState<PostEngagement>(engagement ?? EMPTY_ENGAGEMENT)
  const [comments, setComments] = useState<FeedPost[]>([])
  const [commentMetrics, setCommentMetrics] = useState<Record<string, PostEngagement>>({})
  const [commentText, setCommentText] = useState('')
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)
  const [repostLoading, setRepostLoading] = useState(false)
  const [commentLoading, setCommentLoading] = useState(false)

  const navigateToPost = () => {
    router.push(`/post/${post.id}`)
  }

  const preventCardNavigation = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation()
  }

  const loadComments = async () => {
    setCommentsLoading(true)
    const { posts, engagementByPostId } = await fetchComments(targetPost.id, user?.id)
    setComments(posts)
    setCommentMetrics(engagementByPostId)
    setCommentsLoading(false)
  }

  const handleDelete = async () => {
    if (!confirm('Excluir esta publicação?')) return
    await supabase.from('posts').delete().eq('id', post.id)
    onDeleted?.()
  }

  const handleToggleComments = async () => {
    const nextOpen = !commentsOpen
    setCommentsOpen(nextOpen)
    if (nextOpen) {
      await loadComments()
    }
  }

  const handleLike = async () => {
    if (!user || likeLoading) return

    setLikeLoading(true)

    if (metrics.likedByMe) {
      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', targetPost.id)
        .eq('user_id', user.id)

      if (!error) {
        setMetrics((current) => ({
          ...current,
          likedByMe: false,
          likeCount: Math.max(0, current.likeCount - 1),
        }))
        onUpdated?.()
      }
    } else {
      const { error } = await supabase
        .from('post_likes')
        .insert({ post_id: targetPost.id, user_id: user.id })

      if (!error) {
        setMetrics((current) => ({
          ...current,
          likedByMe: true,
          likeCount: current.likeCount + 1,
        }))
        onUpdated?.()
      }
    }

    setLikeLoading(false)
  }

  const handleRepost = async () => {
    if (!user || repostLoading) return

    setRepostLoading(true)

    if (metrics.repostedByMe) {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('user_id', user.id)
        .eq('repost_of_post_id', targetPost.id)
        .is('parent_post_id', null)

      if (!error) {
        setMetrics((current) => ({
          ...current,
          repostedByMe: false,
          repostCount: Math.max(0, current.repostCount - 1),
        }))
        onUpdated?.()
      }
    } else {
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: '',
          repost_of_post_id: targetPost.id,
        })

      if (!error) {
        setMetrics((current) => ({
          ...current,
          repostedByMe: true,
          repostCount: current.repostCount + 1,
        }))
        onUpdated?.()
      }
    }

    setRepostLoading(false)
  }

  const handleComment = async () => {
    if (!user || !commentText.trim() || commentLoading) return

    setCommentLoading(true)
    const { error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        content: commentText.trim(),
        parent_post_id: targetPost.id,
      })

    if (!error) {
      setCommentText('')
      setMetrics((current) => ({
        ...current,
        replyCount: current.replyCount + 1,
      }))
      if (!commentsOpen) {
        setCommentsOpen(true)
      }
      await loadComments()
      onUpdated?.()
    }

    setCommentLoading(false)
  }

  return (
    <article
      onClick={navigateToPost}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          navigateToPost()
        }
      }}
      role="link"
      tabIndex={0}
      className={`${compact ? 'px-0 py-3' : 'px-4 py-3 hover:bg-white/[0.03]'} border-b border-border transition-colors duration-150 cursor-pointer`}
    >
      {post.originalPost && (
        <div className="mb-2 pl-[52px] text-[13px] text-text-secondary">
          <span className="font-semibold text-text-primary">{post.profiles.full_name}</span> repostou
        </div>
      )}

      <div className="flex gap-3">
        <Link href={`/profile/${post.user_id}`} onClick={preventCardNavigation} className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-bg-tertiary">
            <img src={post.profiles.avatar_url || DEFAULT_AVATAR} alt={`${post.profiles.full_name} avatar`} className="w-full h-full object-cover" />
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 min-w-0">
            <Link href={`/profile/${post.user_id}`} onClick={preventCardNavigation} className="font-bold text-[15px] hover:underline truncate">
              {post.profiles.full_name}
            </Link>
            <span className="text-text-secondary text-[15px] whitespace-nowrap">@{post.profiles.username}</span>
            <span className="text-text-secondary text-[15px]">·</span>
            <span className="text-text-secondary text-[15px] whitespace-nowrap flex-shrink-0">
              {formatDate(post.created_at)}
            </span>
            {isOwner && (
              <button
                onClick={(event) => {
                  event.stopPropagation()
                  void handleDelete()
                }}
                className="ml-auto w-[34px] h-[34px] flex items-center justify-center rounded-full text-text-secondary hover:text-accent hover:bg-accent/10 transition-all duration-150"
              >
                <MoreIcon />
              </button>
            )}
          </div>

          {post.content && (
            <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed">
              {post.content}
            </p>
          )}

          {post.originalPost ? (
            <div className="mt-3 rounded-2xl border border-border px-3">
              <TweetCard post={post.originalPost} engagement={metrics} onUpdated={onUpdated} compact />
            </div>
          ) : null}

          <div className="mt-3 flex items-center justify-between max-w-[320px]">
            <button
              onClick={(event) => {
                event.stopPropagation()
                void handleToggleComments()
              }}
              className="flex items-center gap-1 text-text-secondary text-[13px] group cursor-pointer"
            >
              <span className="w-[34px] h-[34px] flex items-center justify-center rounded-full group-hover:bg-accent/10 group-hover:text-accent transition-all duration-150">
                <ReplyIcon />
              </span>
              <span>{formatCount(metrics.replyCount)}</span>
            </button>

            <button
              onClick={(event) => {
                event.stopPropagation()
                void handleRepost()
              }}
              disabled={!user || repostLoading}
              className={`flex items-center gap-1 text-[13px] group cursor-pointer ${metrics.repostedByMe ? 'text-success' : 'text-text-secondary'}`}
            >
              <span className="w-[34px] h-[34px] flex items-center justify-center rounded-full group-hover:bg-success/10 group-hover:text-success transition-all duration-150">
                <RetweetIcon />
              </span>
              <span>{formatCount(metrics.repostCount)}</span>
            </button>

            <button
              onClick={(event) => {
                event.stopPropagation()
                void handleLike()
              }}
              disabled={!user || likeLoading}
              className={`flex items-center gap-1 text-[13px] group cursor-pointer ${metrics.likedByMe ? 'text-like' : 'text-text-secondary'}`}
            >
              <span className="w-[34px] h-[34px] flex items-center justify-center rounded-full group-hover:bg-like/10 group-hover:text-like transition-all duration-150">
                <LikeIcon />
              </span>
              <span>{formatCount(metrics.likeCount)}</span>
            </button>
          </div>

          {commentsOpen && (
            <div className="mt-4 border-t border-border pt-4" onClick={preventCardNavigation}>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-bg-tertiary">
                  <img src={currentProfile?.avatar_url || DEFAULT_AVATAR} alt="Your avatar" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <textarea
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
                    placeholder="Escreva sua resposta"
                    rows={2}
                    className="w-full resize-none rounded-2xl border border-border bg-transparent px-3 py-2 text-[15px] placeholder:text-text-secondary"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={handleComment}
                      disabled={!commentText.trim() || commentLoading}
                      className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
                    >
                      {commentLoading ? 'Respondendo...' : 'Responder'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                {commentsLoading ? (
                  <div className="py-4 text-center text-[14px] text-text-secondary">Carregando respostas...</div>
                ) : comments.length > 0 ? (
                  depth < MAX_INLINE_DEPTH ? (
                    comments.map((comment) => (
                      <div key={comment.id} className="border-l-2 border-border pl-3">
                        <TweetCard
                          post={comment}
                          engagement={commentMetrics[comment.id]}
                          onDeleted={async () => {
                            await loadComments()
                            onUpdated?.()
                          }}
                          onUpdated={loadComments}
                          compact
                          depth={depth + 1}
                        />
                      </div>
                    ))
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="border-l-2 border-border pl-3">
                        <div className="flex items-center gap-2 py-2">
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-bg-tertiary flex-shrink-0">
                            <img src={comment.profiles.avatar_url || DEFAULT_AVATAR} alt="" className="w-full h-full object-cover" />
                          </div>
                          <span className="text-[13px] text-text-secondary truncate">
                            <span className="font-bold text-text-primary">{comment.profiles.full_name}</span>{' '}
                            @{comment.profiles.username}
                          </span>
                          <Link
                            href={`/post/${comment.id}`}
                            onClick={preventCardNavigation}
                            className="ml-auto text-[13px] text-accent hover:underline whitespace-nowrap"
                          >
                            Ver esta thread
                          </Link>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  <div className="py-4 text-center text-[14px] text-text-secondary">Nenhuma resposta ainda.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
