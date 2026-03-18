'use client'

import { useEffect, useState } from 'react'
import { fetchTrendingHashtags, type TrendingHashtag } from '@/lib/posts'

function formatCount(count: number) {
  return count === 1 ? '1 post recente' : `${count} posts recentes`
}

function TrendingSkeleton() {
  return (
    <div className="space-y-3 px-4 py-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="animate-pulse rounded-2xl bg-white/5 px-3 py-3">
          <div className="h-3 w-20 rounded-full bg-white/10" />
          <div className="mt-2 h-4 w-32 rounded-full bg-white/10" />
          <div className="mt-2 h-3 w-24 rounded-full bg-white/10" />
        </div>
      ))}
    </div>
  )
}

export default function TrendingSidebar() {
  const [hashtags, setHashtags] = useState<TrendingHashtag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const loadTrending = async () => {
      try {
        setLoading(true)
        setError(null)
        const nextHashtags = await fetchTrendingHashtags(5, 7)

        if (!active) return

        setHashtags(nextHashtags)
      } catch {
        if (!active) return

        setError('Nao foi possivel carregar as hashtags em alta.')
        setHashtags([])
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadTrending()

    return () => {
      active = false
    }
  }, [])

  return (
    <aside className="w-[350px] sticky top-0 h-screen flex-shrink-0 overflow-y-auto px-6">
      <div className="mt-3 bg-bg-secondary rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60">
          <h2 className="text-xl font-extrabold">O que est&aacute; acontecendo</h2>
          <p className="mt-1 text-[13px] text-text-secondary">
            Hashtags em alta nos ultimos dias
          </p>
        </div>

        {loading ? (
          <TrendingSkeleton />
        ) : error ? (
          <div className="px-4 py-4 text-[14px] text-text-secondary">
            {error}
          </div>
        ) : hashtags.length === 0 ? (
          <div className="px-4 py-4 text-[14px] text-text-secondary">
            Nenhuma hashtag em alta no momento.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {hashtags.map((item, index) => (
              <div
                key={item.hashtag}
                className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-white/10 transition-colors duration-150"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-[13px] text-text-secondary">
                    #{item.hashtag}
                  </span>
                  <p className="mt-1 text-[15px] font-bold break-words">
                    #{item.hashtag}
                  </p>
                  <span className="mt-0.5 block text-[13px] text-text-secondary">
                    {formatCount(item.postCount)}
                  </span>
                </div>
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/5 text-[13px] font-bold text-text-primary">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
