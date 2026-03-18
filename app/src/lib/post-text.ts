export const HASHTAG_REGEX = /(^|[^\p{L}\p{N}_])#([\p{L}\p{N}_]{1,50})/gu

export interface PostTextSegment {
  type: 'text' | 'hashtag'
  value: string
  hashtag?: string
}

export function extractHashtags(content: string): string[] {
  const hashtags = new Set<string>()

  for (const match of content.matchAll(HASHTAG_REGEX)) {
    const hashtag = match[2]?.toLowerCase()
    if (hashtag) {
      hashtags.add(hashtag)
    }
  }

  return Array.from(hashtags)
}

export function splitPostContent(content: string): PostTextSegment[] {
  const segments: PostTextSegment[] = []
  let cursor = 0

  for (const match of content.matchAll(HASHTAG_REGEX)) {
    const fullMatch = match[0]
    const prefix = match[1] ?? ''
    const hashtag = match[2]
    const matchIndex = match.index ?? 0
    const hashtagIndex = matchIndex + prefix.length
    const before = content.slice(cursor, hashtagIndex)

    if (before) {
      segments.push({ type: 'text', value: before })
    }

    if (hashtag) {
      segments.push({
        type: 'hashtag',
        value: `#${hashtag}`,
        hashtag: hashtag.toLowerCase(),
      })
    }

    cursor = matchIndex + fullMatch.length
  }

  if (cursor < content.length) {
    segments.push({ type: 'text', value: content.slice(cursor) })
  }

  return segments
}
