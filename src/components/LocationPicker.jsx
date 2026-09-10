import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LocateFixed, MapPin, Search } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useClickOutside } from '@/hooks/useClickOutside'
import { useGeolocation } from '@/hooks/useGeolocation'
import { searchPlaces, reverseGeocode } from '@/services/geoService'

/**
 * Lets the farmer pick a location by GPS or by search. Calls
 * `onSelect({ latitude, longitude, name, admin1 })`. No typing of weather or
 * soil numbers - that is derived from the chosen point.
 */
export function LocationPicker({ onSelect, compact = false }) {
  const { t, i18n } = useTranslation()
  const { status: geoStatus, request } = useGeolocation()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState(null)

  const boxRef = useRef(null)
  useClickOutside(boxRef, () => setOpen(false), open)

  // Debounced place search.
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      return
    }
    let cancelled = false
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const places = await searchPlaces(q, i18n.resolvedLanguage)
        if (!cancelled) {
          setResults(places)
          setOpen(true)
        }
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 350)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, i18n.resolvedLanguage])

  const useMyLocation = async () => {
    setMessage(null)
    const coords = await request()
    if (!coords) {
      setMessage(
        geoStatus === 'denied'
          ? t('weather.location.permissionDenied')
          : t('weather.location.unavailable'),
      )
      return
    }
    const place = await reverseGeocode(
      coords.latitude,
      coords.longitude,
      i18n.resolvedLanguage,
    )
    onSelect({
      latitude: coords.latitude,
      longitude: coords.longitude,
      name: place.name,
      admin1: place.admin1,
    })
  }

  const pick = (place) => {
    setQuery('')
    setResults([])
    setOpen(false)
    onSelect({
      latitude: place.latitude,
      longitude: place.longitude,
      name: place.name,
      admin1: place.admin1,
    })
  }

  return (
    <div className={cn('w-full', compact ? 'max-w-md' : 'max-w-xl')}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          onClick={useMyLocation}
          disabled={geoStatus === 'locating'}
          iconLeft={
            geoStatus === 'locating' ? (
              <Spinner size={16} />
            ) : (
              <LocateFixed className="h-4 w-4" />
            )
          }
          className="shrink-0"
        >
          {geoStatus === 'locating'
            ? t('weather.location.detecting')
            : t('common.useMyLocation')}
        </Button>

        <div ref={boxRef} className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            placeholder={t('weather.location.searchPlaceholder')}
            className="h-11 w-full rounded-xl border border-line bg-white pl-9 pr-9 text-sm outline-none transition-colors focus:border-brand-500"
          />
          {searching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
              <Spinner size={14} />
            </span>
          )}

          {open && (
            <ul className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-line bg-white p-1.5 shadow-[var(--shadow-lift)]">
              {results.length === 0 && !searching ? (
                <li className="px-3 py-2 text-sm text-muted">
                  {t('weather.location.noResults')}
                </li>
              ) : (
                results.map((place) => (
                  <li key={`${place.id}-${place.latitude}`}>
                    <button
                      type="button"
                      onClick={() => pick(place)}
                      className="flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-black/5"
                    >
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                      <span>
                        <span className="font-semibold text-ink">{place.name}</span>
                        <span className="block text-xs text-muted">
                          {[place.admin1, place.country].filter(Boolean).join(', ')}
                        </span>
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      </div>

      {message && <p className="mt-2 text-sm text-warning">{message}</p>}
    </div>
  )
}
