'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Sidebar from './Sidebar'
import TrendingSidebar from './TrendingSidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [refreshKey, setRefreshKey] = useState(0)

  const handlePostCreated = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex justify-center min-h-screen max-w-[1280px] mx-auto">
      <Sidebar onPostCreated={handlePostCreated} />
      <main className="w-[600px] min-h-screen border-r border-border" key={refreshKey}>
        {children}
      </main>
      <TrendingSidebar />
    </div>
  )
}
