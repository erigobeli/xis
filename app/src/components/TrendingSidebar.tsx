const trendingItems = [
  {
    category: 'YouTube',
    label: 'Crie apps',
    promoted: 'Eli Rigobeli',
    href: 'https://youtu.be/JEESRkJ0fXA',
    thumbnail: 'https://img.youtube.com/vi/JEESRkJ0fXA/hqdefault.jpg',
  },
  {
    category: 'YouTube',
    label: 'Codex App',
    promoted: 'Eli Rigobeli',
    href: 'https://youtu.be/lCu2V8qesyg',
    thumbnail: 'https://img.youtube.com/vi/lCu2V8qesyg/hqdefault.jpg',
  },
  {
    category: 'YouTube',
    label: 'CLI',
    promoted: 'Eli Rigobeli',
    href: 'https://youtu.be/wbkhrHKeHnQ',
    thumbnail: 'https://img.youtube.com/vi/wbkhrHKeHnQ/hqdefault.jpg',
  },
]

export default function TrendingSidebar() {
  return (
    <aside className="w-[350px] sticky top-0 h-screen flex-shrink-0 overflow-y-auto px-6">
      {/* Trending Box */}
      <div className="mt-3 bg-bg-secondary rounded-2xl overflow-hidden">
        <h2 className="text-xl font-extrabold px-4 py-3">O que está acontecendo</h2>

        {trendingItems.map((item, i) => (
          <a
            key={i}
            href={item.href}
            target="_blank"
            rel="noreferrer"
            className="flex justify-between items-start gap-3 px-4 py-3 hover:bg-white/10 transition-colors duration-150 cursor-pointer"
          >
            <div className="flex-1 min-w-0">
              <span className="text-[13px] text-text-secondary">{item.category}</span>
              <p className="text-[15px] font-bold">{item.label}</p>
              <span className="flex items-center gap-1 text-[13px] text-text-secondary mt-0.5">
                <svg viewBox="0 0 24 24" className="w-[14px] h-[14px] fill-text-secondary">
                  <path d="M19.498 3h-15c-1.381 0-2.5 1.12-2.5 2.5v13c0 1.38 1.119 2.5 2.5 2.5h15c1.381 0 2.5-1.12 2.5-2.5v-13c0-1.38-1.119-2.5-2.5-2.5zm-3.502 12h-2v-3.59l-5.293 5.3-1.414-1.42L12.581 10H8.998V8h7.998v7z" />
                </svg>
                {item.promoted}
              </span>
            </div>
            <div className="flex-shrink-0">
              <img
                src={item.thumbnail}
                alt={item.label}
                className="w-20 h-20 rounded-2xl object-cover"
              />
            </div>
          </a>
        ))}
      </div>
    </aside>
  )
}
