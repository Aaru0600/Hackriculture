import { useEffect } from 'react'

/** Call `handler` when a pointer/keydown happens outside `ref`. */
export function useClickOutside(ref, handler, active = true) {
  useEffect(() => {
    if (!active) return
    const onPointer = (e) => {
      if (ref.current && !ref.current.contains(e.target)) handler(e)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') handler(e)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [ref, handler, active])
}
