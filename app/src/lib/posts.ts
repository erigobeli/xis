import { supabase } from './supabase'

export interface ProfileSummary {
  full_name: string
  username: string
  avatar_url: string | null
}

export interface FeedPost {
  id: string
  content: string
  created_at: string
  user_id: string
  parent_post_id: string | null
  repost_of_post_id: string | null
  profiles: ProfileSummary
  originalPost: FeedPost | null
}

export interface PostEngagement {
  replyCount: number
  repostCount: number
  likeCount: number
  likedByMe: boolean
  repostedByMe: boolean
}

type RawProfile = ProfileSummary | ProfileSummary[]

type RawPost = {
  id: string
  content: string
  created_at: string
  user_id: string
  parent_post_id: string | null
  repost_of_post_id: string | null
  profiles: RawProfile
  original?: RawPost | RawPost[] | null
}

function normalizeProfile(profile: RawProfile): ProfileSummary {
  return Array.isArray(profile) ? profile[0] : profile
}

function normalizeNestedPost(post: RawPost | RawPost[] | null | undefined): FeedPost | null {
  if (!post) return null

  const value = Array.isArray(post) ? post[0] : post
  if (!value) return null

  return {
    id: value.id,
    content: value.content,
    created_at: value.created_at,
    user_id: value.user_id,
    parent_post_id: value.parent_post_id,
    repost_of_post_id: value.repost_of_post_id,
    profiles: normalizeProfile(value.profiles),
    originalPost: null,
  }
}

function normalizePost(post: RawPost): FeedPost {
  return {
    id: post.id,
    content: post.content,
    created_at: post.created_at,
    user_id: post.user_id,
    parent_post_id: post.parent_post_id,
    repost_of_post_id: post.repost_of_post_id,
    profiles: normalizeProfile(post.profiles),
    originalPost: normalizeNestedPost(post.original),
  }
}

const POST_SELECT = `
  id,
  content,
  created_at,
  user_id,
  parent_post_id,
  repost_of_post_id,
  profiles!posts_user_id_fkey(full_name, username, avatar_url),
  original:repost_of_post_id(
    id,
    content,
    created_at,
    user_id,
    parent_post_id,
    repost_of_post_id,
    profiles!posts_user_id_fkey(full_name, username, avatar_url)
  )
`

async function fetchEngagement(postIds: string[], currentUserId?: string | null): Promise<Record<string, PostEngagement>> {
  if (postIds.length === 0) {
    return {}
  }

  const [repliesRes, repostsRes, likesRes] = await Promise.all([
    supabase
      .from('posts')
      .select('parent_post_id')
      .in('parent_post_id', postIds),
    supabase
      .from('posts')
      .select('repost_of_post_id, user_id')
      .in('repost_of_post_id', postIds)
      .is('parent_post_id', null),
    supabase
      .from('post_likes')
      .select('post_id, user_id')
      .in('post_id', postIds),
  ])

  const engagement: Record<string, PostEngagement> = Object.fromEntries(
    postIds.map((postId) => [postId, {
      replyCount: 0,
      repostCount: 0,
      likeCount: 0,
      likedByMe: false,
      repostedByMe: false,
    }]),
  )

  for (const reply of repliesRes.data ?? []) {
    if (reply.parent_post_id && engagement[reply.parent_post_id]) {
      engagement[reply.parent_post_id].replyCount += 1
    }
  }

  for (const repost of repostsRes.data ?? []) {
    if (repost.repost_of_post_id && engagement[repost.repost_of_post_id]) {
      engagement[repost.repost_of_post_id].repostCount += 1
      if (currentUserId && repost.user_id === currentUserId) {
        engagement[repost.repost_of_post_id].repostedByMe = true
      }
    }
  }

  for (const like of likesRes.data ?? []) {
    if (like.post_id && engagement[like.post_id]) {
      engagement[like.post_id].likeCount += 1
      if (currentUserId && like.user_id === currentUserId) {
        engagement[like.post_id].likedByMe = true
      }
    }
  }

  return engagement
}

export async function fetchFeedPosts(currentUserId?: string | null, profileId?: string) {
  let query = supabase
    .from('posts')
    .select(POST_SELECT)
    .is('parent_post_id', null)
    .order('created_at', { ascending: false })

  if (profileId) {
    query = query.eq('user_id', profileId)
  } else if (currentUserId) {
    const { data: followData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUserId)

    const followingIds = (followData ?? []).map((r) => r.following_id)
    const visibleUserIds = [currentUserId, ...followingIds]

    query = query.in('user_id', visibleUserIds)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  const posts = (data as RawPost[] | null)?.map(normalizePost) ?? []
  const targetPostIds = Array.from(new Set(posts.map((post) => post.originalPost?.id ?? post.id)))
  const engagementByPostId = await fetchEngagement(targetPostIds, currentUserId)

  return { posts, engagementByPostId }
}

export async function fetchPostById(postId: string, currentUserId?: string | null) {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('id', postId)
    .single()

  if (error) {
    throw error
  }

  const post = normalizePost(data as RawPost)
  const targetPostId = post.originalPost?.id ?? post.id
  const engagementByPostId = await fetchEngagement([targetPostId], currentUserId)

  return {
    post,
    engagement: engagementByPostId[targetPostId],
  }
}

export async function fetchComments(parentPostId: string, currentUserId?: string | null) {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      content,
      created_at,
      user_id,
      parent_post_id,
      repost_of_post_id,
      profiles!posts_user_id_fkey(full_name, username, avatar_url)
    `)
    .eq('parent_post_id', parentPostId)
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  const posts = (data as RawPost[] | null)?.map(normalizePost) ?? []
  const engagementByPostId = await fetchEngagement(posts.map((post) => post.id), currentUserId)

  return { posts, engagementByPostId }
}
