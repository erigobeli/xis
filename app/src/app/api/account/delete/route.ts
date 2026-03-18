import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return NextResponse.json(
      { error: 'Configure NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 500 }
    )
  }

  const authorization = request.headers.get('authorization')
  const accessToken = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : null

  if (!accessToken) {
    return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser(accessToken)

  if (userError || !user) {
    return NextResponse.json({ error: 'Sessao invalida.' }, { status: 401 })
  }

  const userId = user.id

  const deleteLikes = await adminClient
    .from('post_likes')
    .delete()
    .eq('user_id', userId)

  if (deleteLikes.error) {
    return NextResponse.json({ error: deleteLikes.error.message }, { status: 500 })
  }

  const deleteFollowsByFollower = await adminClient
    .from('follows')
    .delete()
    .eq('follower_id', userId)

  if (deleteFollowsByFollower.error) {
    return NextResponse.json({ error: deleteFollowsByFollower.error.message }, { status: 500 })
  }

  const deleteFollowsByFollowing = await adminClient
    .from('follows')
    .delete()
    .eq('following_id', userId)

  if (deleteFollowsByFollowing.error) {
    return NextResponse.json({ error: deleteFollowsByFollowing.error.message }, { status: 500 })
  }

  const deletePosts = await adminClient
    .from('posts')
    .delete()
    .eq('user_id', userId)

  if (deletePosts.error) {
    return NextResponse.json({ error: deletePosts.error.message }, { status: 500 })
  }

  const deleteProfile = await adminClient
    .from('profiles')
    .delete()
    .eq('id', userId)

  if (deleteProfile.error) {
    return NextResponse.json({ error: deleteProfile.error.message }, { status: 500 })
  }

  const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId)

  if (deleteUserError) {
    return NextResponse.json({ error: deleteUserError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
