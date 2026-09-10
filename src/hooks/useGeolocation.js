import { useCallback, useState } from 'react'

/**
 * Thin wrapper over the browser Geolocation API.
 * Returns { coords, status, error, request } where status is one of
 * 'idle' | 'locating' | 'success' | 'denied' | 'unavailable'.
 */
export function useGeolocation() {
  const [coords, setCoords] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unavailable')
      setError('Geolocation is not supported on this device.')
      return Promise.resolve(null)
    }

    setStatus('locating')
    setError(null)

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }
          setCoords(next)
          setStatus('success')
          resolve(next)
        },
        (err) => {
          const denied = err.code === err.PERMISSION_DENIED
          setStatus(denied ? 'denied' : 'unavailable')
          setError(err.message)
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5 * 60 * 1000 },
      )
    })
  }, [])

  return { coords, status, error, request }
}
