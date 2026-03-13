import { supabase } from './supabase'

export async function followUser(followingId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: user.id, following_id: followingId })

  if (error) throw error
}

export async function unfollowUser(followingId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', followingId)

  if (error) throw error
}

export async function getFollowingIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)

  if (error) throw error
  return (data ?? []).map((row) => row.following_id)
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle()

  if (error) throw error
  return !!data
}

export async function getFollowCounts(userId: string) {
  const [followingRes, followersRes] = await Promise.all([
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
  ])

  return {
    followingCount: followingRes.count ?? 0,
    followersCount: followersRes.count ?? 0,
  }
}

export interface FollowedProfile {
  id: string
  username: string
  full_name: string
  avatar_url: string | null
}

export async function getFollowingProfiles(userId: string): Promise<FollowedProfile[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('following_id, profiles!follows_following_id_fkey(id, username, full_name, avatar_url)')
    .eq('follower_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    return profile as FollowedProfile
  })
}
