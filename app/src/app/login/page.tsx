'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { XLogo } from '@/components/icons'

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/')
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!username.trim() || !fullName.trim()) {
      setError('Nome de usuário e nome completo são obrigatórios.')
      setLoading(false)
      return
    }

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          username: username.trim().toLowerCase(),
          full_name: fullName.trim(),
        })

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }
    }

    router.push('/')
  }

  const inputClass = "w-full px-4 py-3 bg-login-bg text-login-text border border-login-border rounded text-[15px] outline-none transition-all duration-200 placeholder:text-login-muted focus:border-accent focus:shadow-[0_0_0_1px_var(--color-accent)]"

  return (
    <main className="flex items-center justify-center min-h-screen bg-login-bg text-login-text">
      {/* Left: Logo */}
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="w-[350px] h-[350px]">
          <XLogo className="w-full h-full text-login-text" />
        </div>
      </div>

      {/* Right: Content */}
      <div className="flex-1 max-w-[480px] p-12">
        <h1 className="text-[64px] font-extrabold leading-[1.2] mb-12 text-login-text">
          Acontecendo agora
        </h1>

        {!isSignUp ? (
          <>
            <h2 className="text-[32px] font-extrabold mb-8 text-login-text">Entrar no X</h2>

            <form onSubmit={handleLogin} className="flex flex-col gap-5 max-w-[300px]">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className={inputClass}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                required
                className={inputClass}
              />
              {error && <p className="text-danger text-[13px]">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center w-full py-3 bg-login-text text-login-bg font-bold text-[15px] rounded-full hover:opacity-85 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <div className="mt-12 max-w-[300px]">
              <p className="text-[16px] font-bold mb-5 text-login-text">Não tem uma conta?</p>
              <button
                onClick={() => { setIsSignUp(true); setError('') }}
                className="flex items-center justify-center w-full py-3 border border-login-border-alt text-accent font-bold text-[15px] rounded-full hover:bg-accent/10 transition-colors"
              >
                Criar conta
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-[32px] font-extrabold mb-8 text-login-text">Criar sua conta</h2>

            <form onSubmit={handleSignUp} className="flex flex-col gap-5 max-w-[300px]">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nome completo"
                required
                className={inputClass}
              />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                required
                className={inputClass}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className={inputClass}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha (min. 6 caracteres)"
                required
                minLength={6}
                className={inputClass}
              />
              {error && <p className="text-danger text-[13px]">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center w-full py-3 bg-login-text text-login-bg font-bold text-[15px] rounded-full hover:opacity-85 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Criando...' : 'Criar conta'}
              </button>
            </form>

            <p className="text-text-secondary text-[13px] mt-2 max-w-[300px] leading-relaxed">
              Ao se inscrever, você concorda com os <a href="#" className="text-accent hover:underline">Termos de Serviço</a> e
              a <a href="#" className="text-accent hover:underline">Política de Privacidade</a>, incluindo o <a href="#" className="text-accent hover:underline">Uso de Cookies</a>.
            </p>

            <div className="mt-12 max-w-[300px]">
              <p className="text-[16px] font-bold mb-5 text-login-text">Já tem uma conta?</p>
              <button
                onClick={() => { setIsSignUp(false); setError('') }}
                className="flex items-center justify-center w-full py-3 border border-login-border-alt text-accent font-bold text-[15px] rounded-full hover:bg-accent/10 transition-colors"
              >
                Entrar
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
