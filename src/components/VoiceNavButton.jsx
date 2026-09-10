import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Mic, MicOff } from 'lucide-react'
import { useVoiceNav } from '@/hooks/useVoiceNav'
import { cn } from '@/lib/cn'

/**
 * Topbar mic button for hands-free navigation. Tap, then say a page name
 * ("crop prediction", "weather", "history"...). Hidden if the browser has no
 * SpeechRecognition.
 */
export function VoiceNavButton() {
  const { t } = useTranslation()
  const { supported, listening, toggle, feedback } = useVoiceNav()
  const [showToast, setShowToast] = useState(false)

  useEffect(() => {
    if (!feedback) return
    setShowToast(true)
    const id = setTimeout(() => setShowToast(false), 2600)
    return () => clearTimeout(id)
  }, [feedback])

  if (!supported) return null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={t('voiceNav.label')}
        aria-pressed={listening}
        className={cn(
          'grid h-9 w-9 place-items-center rounded-full transition-colors',
          listening ? 'bg-danger text-white animate-pulse' : 'text-ink/70 hover:bg-black/5',
        )}
      >
        {listening ? <MicOff size={17} /> : <Mic size={17} />}
      </button>
      {showToast && feedback && (
        <span className="absolute right-0 top-11 z-30 whitespace-nowrap rounded-lg bg-ink px-3 py-1.5 text-xs text-white shadow-lg">
          {feedback}
        </span>
      )}
    </div>
  )
}
