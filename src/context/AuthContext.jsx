import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import i18n from '@/i18n'
import * as authService from '@/services/authService'

const AuthContext = createContext(null)

/**
 * App-wide auth state. status is 'loading' until the stored session is
 * resolved, then 'authed' or 'guest'. Route guards read this.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let active = true
    authService
      .getCurrentUser()
      .then((u) => {
        if (!active) return
        setUser(u)
        setStatus(u ? 'authed' : 'guest')
        if (u?.preferredLanguage) i18n.changeLanguage(u.preferredLanguage)
      })
      .catch(() => active && setStatus('guest'))
    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (credentials) => {
    const { user: u } = await authService.login(credentials)
    setUser(u)
    setStatus('authed')
    if (u?.preferredLanguage) i18n.changeLanguage(u.preferredLanguage)
    return u
  }, [])

  const register = useCallback(async (payload) => {
    const { user: u } = await authService.register(payload)
    setUser(u)
    setStatus('authed')
    if (u?.preferredLanguage) i18n.changeLanguage(u.preferredLanguage)
    return u
  }, [])

  const verifyEmail = useCallback(async (token) => {
    const { user: u } = await authService.verifyEmail(token)
    setUser(u)
    setStatus('authed')
    if (u?.preferredLanguage) i18n.changeLanguage(u.preferredLanguage)
    return u
  }, [])

  const logout = useCallback(async () => {
    await authService.logout()
    setUser(null)
    setStatus('guest')
  }, [])

  const updateUser = useCallback(async (patch) => {
    const updated = await authService.updateProfile(patch)
    setUser(updated)
    return updated
  }, [])

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authed',
      isAdmin: user?.role === 'admin',
      login,
      register,
      verifyEmail,
      logout,
      updateUser,
    }),
    [user, status, login, register, verifyEmail, logout, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
