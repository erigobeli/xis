'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { XLogo, HomeIcon, ProfileIcon, MoreIcon } from './icons'
import { useAuth } from '@/contexts/AuthContext'
import PostModal from './PostModal'

const DEFAULT_AVATAR = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_bigger.png'

function FollowIcon({ className = "w-[26px] h-[26px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M7.501 19.917L7.471 21H.472l.029-1.027c.184-6.618 3.736-8.977 7-8.977.963 0 1.95.212 2.87.672-.444.478-.851 1.03-1.212 1.656-.507-.204-1.054-.328-1.658-.328-2.767 0-4.57 2.223-4.938 6.004H7.56c-.023.302-.05.599-.059.917zm15.998.056L23.528 21H9.472l.029-1.027c.184-6.618 3.736-8.977 7-8.977s6.816 2.358 7 8.977zM21.437 19c-.367-3.781-2.17-6.004-4.938-6.004s-4.57 2.223-4.938 6.004h9.875zm-4.938-9c-.799 0-1.527-.279-2.116-.73-.413-.317-.752-.712-1.003-1.166-.319-.579-.497-1.253-.497-1.971 0-2.313 1.688-4.133 3.616-4.133s3.616 1.82 3.616 4.133c0 .718-.179 1.392-.498 1.971-.251.454-.59.849-1.003 1.166-.588.451-1.316.73-2.115.73zM16.5 3c-1.105 0-2.616 1.094-2.616 3.133 0 1.779 1.26 2.867 2.616 2.867s2.616-1.088 2.616-2.867C19.116 4.094 17.605 3 16.5 3zM7.5 11C5.57 11 4 9.433 4 7.5S5.57 4 7.5 4 11 5.567 11 7.5 9.43 11 7.5 11zm0-6C6.12 5 5 6.12 5 7.5S6.12 10 7.5 10 10 8.88 10 7.5 8.88 5 7.5 5z" />
    </svg>
  )
}

interface SidebarProps {
  onPostCreated?: () => void
}

export default function Sidebar({ onPostCreated }: SidebarProps) {
  const pathname = usePathname()
  const { user, profile, signOut } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const navLinks = [
    { href: '/', label: 'Início', icon: HomeIcon },
    { href: '/follow', label: 'Seguir', icon: FollowIcon },
    { href: `/profile/${user?.id}`, label: 'Perfil', icon: ProfileIcon },
  ]

  return (
    <>
      <aside className="w-[275px] sticky top-0 h-screen border-r border-border flex-shrink-0 overflow-y-auto flex flex-col items-end">
        <div className="flex flex-col justify-between h-full w-full max-w-[236px] px-3 py-2">
          <nav className="flex flex-col">
            {/* Logo */}
            <Link href="/" className="flex items-center justify-start p-3 mb-1 w-fit rounded-full hover:bg-white/10 transition-colors duration-150">
              <XLogo className="w-7 h-7" />
            </Link>

            {/* Nav Links */}
            <div className="flex flex-col gap-1">
              {navLinks.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href
                return (
                  <Link
                    key={label}
                    href={href}
                    className="flex items-center gap-5 py-3 px-3 pr-6 rounded-full hover:bg-white/10 transition-colors duration-150 text-xl w-fit"
                  >
                    <span className="w-[26px] h-[26px] flex items-center justify-center">
                      <Icon />
                    </span>
                    <span className={isActive ? 'font-bold' : 'font-normal'}>{label}</span>
                  </Link>
                )
              })}
            </div>

            {/* Post Button */}
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center justify-center w-full py-4 mt-4 bg-accent text-white text-base font-bold rounded-full hover:bg-accent-hover transition-colors duration-150"
            >
              Publicar
            </button>
          </nav>

          {/* User Info */}
          <div className="relative mb-3">
            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-black rounded-2xl shadow-[0_0_15px_rgba(255,255,255,0.1)] overflow-hidden z-50">
                <button
                  onClick={() => { signOut(); setShowUserMenu(false) }}
                  className="w-full px-4 py-3 text-left text-[15px] font-bold hover:bg-white/10 transition-colors"
                >
                  Sair @{profile?.username || 'user'}
                </button>
              </div>
            )}

            <div
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 p-3 rounded-full hover:bg-white/10 transition-colors duration-150 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-bg-tertiary">
                <img src={profile?.avatar_url || DEFAULT_AVATAR} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-bold text-[15px] truncate">{profile?.full_name || 'User'}</span>
                <span className="text-text-secondary text-[15px] truncate">@{profile?.username || 'user'}</span>
              </div>
              <MoreIcon className="w-[18px] h-[18px] flex-shrink-0" />
            </div>
          </div>
        </div>
      </aside>

      {showModal && (
        <PostModal
          onClose={() => setShowModal(false)}
          onPostCreated={() => {
            setShowModal(false)
            onPostCreated?.()
          }}
        />
      )}
    </>
  )
}
