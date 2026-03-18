import { supabase } from './supabase'

export interface ProfileSummary {
  full_name: string
  username: string
  avatar_url: string | null
}

export interface FeedPost {
  id: string
  content: string
  image_url: string | null
  created_at: string
  user_id: string
  parent_post_id: string | null
  repost_of_post_id: string | null
  profiles: ProfileSummary
  originalPost: FeedPost | null
}

export interface TrendingHashtag {
  hashtag: string
  postCount: number
  recentPostAt: string
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
  image_url: string | null
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
    image_url: value.image_url,
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
    image_url: post.image_url,
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
  image_url,
  created_at,
  user_id,
  parent_post_id,
  repost_of_post_id,
  profiles!posts_user_id_fkey(full_name, username, avatar_url),
  original:repost_of_post_id(
    id,
    content,
    image_url,
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

const POST_IMAGES_BUCKET = 'post-images'
const MAX_POST_IMAGE_SIZE = 5 * 1024 * 1024
const ALLOWED_POST_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp']
const STORAGE_PUBLIC_SEGMENT = `/storage/v1/object/public/${POST_IMAGES_BUCKET}/`

export interface CreatePostInput {
  content?: string
  userId: string
  imageFile?: File | null
  parentPostId?: string | null
  repostOfPostId?: string | null
}

function validatePostImage(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecione um arquivo de imagem.')
  }

  const fileExt = file.name.split('.').pop()?.toLowerCase()
  if (!fileExt || !ALLOWED_POST_IMAGE_EXTENSIONS.includes(fileExt)) {
    throw new Error('Formato não suportado. Use JPG, PNG, GIF ou WebP.')
  }

  if (file.size > MAX_POST_IMAGE_SIZE) {
    throw new Error('A imagem deve ter menos de 5MB.')
  }

  return fileExt
}

async function uploadPostImage(userId: string, file: File) {
  const fileExt = validatePostImage(file)
  const filePath = `${userId}/${crypto.randomUUID()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from(POST_IMAGES_BUCKET)
    .upload(filePath, file, { upsert: false })

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`)
  }

  const { data: urlData } = supabase.storage
    .from(POST_IMAGES_BUCKET)
    .getPublicUrl(filePath)

  return urlData.publicUrl
}

function extractStoragePathFromPublicUrl(imageUrl: string) {
  const markerIndex = imageUrl.indexOf(STORAGE_PUBLIC_SEGMENT)
  if (markerIndex === -1) {
    return null
  }

  const pathWithQuery = imageUrl.slice(markerIndex + STORAGE_PUBLIC_SEGMENT.length)
  return pathWithQuery.split('?')[0] || null
}

async function removePostImageByUrl(imageUrl: string | null | undefined) {
  if (!imageUrl) {
    return
  }

  const storagePath = extractStoragePathFromPublicUrl(imageUrl)
  if (!storagePath) {
    return
  }

  const { error } = await supabase.storage
    .from(POST_IMAGES_BUCKET)
    .remove([storagePath])

  if (error) {
    throw new Error(`Image cleanup failed: ${error.message}`)
  }
}

export async function createPost({
  content = '',
  userId,
  imageFile,
  parentPostId = null,
  repostOfPostId = null,
}: CreatePostInput) {
  const trimmedContent = content.trim()
  const hasContent = trimmedContent.length > 0
  const hasImage = Boolean(imageFile)
  const isRepost = Boolean(repostOfPostId)

  if (!hasContent && !hasImage && !isRepost) {
    throw new Error('Escreva algo ou selecione uma imagem.')
  }

  let imageUrl: string | null = null

  if (imageFile) {
    imageUrl = await uploadPostImage(userId, imageFile)
  }

  try {
    const { error } = await supabase
      .from('posts')
      .insert({
        content: trimmedContent,
        image_url: imageUrl,
        user_id: userId,
        parent_post_id: parentPostId,
        repost_of_post_id: repostOfPostId,
      })

    if (error) {
      throw new Error(error.message)
    }
  } catch (error) {
    try {
      await removePostImageByUrl(imageUrl)
    } catch (cleanupError) {
      const cleanupMessage = cleanupError instanceof Error ? cleanupError.message : 'unknown cleanup error'
      throw new Error(`Post creation failed and image cleanup also failed: ${cleanupMessage}`)
    }

    throw error
  }
}

export interface DeletePostResult {
  imageCleanupFailed: boolean
}

export async function deletePost(postId: string, imageUrl?: string | null): Promise<DeletePostResult> {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)

  if (error) {
    throw error
  }

  try {
    await removePostImageByUrl(imageUrl)
    return { imageCleanupFailed: false }
  } catch {
    return { imageCleanupFailed: true }
  }
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
      image_url,
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

export async function fetchTrendingHashtags(limit = 5, recentDays = 7) {
  const { data, error } = await supabase.rpc('get_trending_hashtags', {
    recent_days: recentDays,
    result_limit: limit,
  })

  if (error) {
    throw error
  }

  return ((data ?? []) as Array<{ hashtag: string; post_count: number | string; recent_post_at: string }>).map((row) => ({
    hashtag: row.hashtag,
    postCount: Number(row.post_count),
    recentPostAt: row.recent_post_at,
  }))
}
