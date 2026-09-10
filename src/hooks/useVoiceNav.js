import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PATHS } from '@/routes/paths'

/**
 * Hands-free navigation via the Web Speech API. Say things like
 * "go to dashboard", "open crop prediction", "weather", "assistant".
 * Silently no-ops in browsers without SpeechRecognition.
 */
const COMMANDS = [
  [/(dashboard|home|main)/, PATHS.dashboard],
  [/(yield|crop prediction|predict)/, PATHS.cropPrediction],
  [/(crop recommendation|which crop|recommend)/, PATHS.cropRecommendation],
  [/(fertil|urea|nutrient)/, PATHS.fertilizer],
  [/(irrigat|water)/, PATHS.irrigation],
  [/(weather|forecast|rain)/, PATHS.weather],
  [/(my farm|farm details)/, PATHS.myFarm],
  [/(history|past|records)/, PATHS.history],
  [/(assistant|krishi|help me|chat)/, PATHS.aiAssistant],
  [/(profile|account|settings)/, PATHS.profile],
]

function resolve(transcript) {
  const t = transcript.toLowerCase().trim()
  for (const [re, path] of COMMANDS) if (re.test(t)) return path
  return null
}

export function useVoiceNav() {
  const navigate = useNavigate()
  const recognitionRef = useRef(null)
  const [listening, setListening] = useState(false)
  const [lastHeard, setLastHeard] = useState('')
  const [feedback, setFeedback] = useState('')

  const supported =
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition)

  useEffect(() => {
    if (!supported) return
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new Ctor()
    rec.continuous = false
    rec.interimResults = false
    rec.lang = document.documentElement.lang || 'en-IN'
    rec.maxAlternatives = 1

    rec.onresult = (e) => {
      const said = e.results[0][0].transcript
      setLastHeard(said)
      const path = resolve(said)
      if (path) {
        setFeedback(`Opening ${path.replace('/', '').replace('-', ' ') || 'dashboard'}`)
        navigate(path)
      } else {
        setFeedback(`Didn't catch a page in "${said}"`)
      }
    }
    rec.onerror = (e) => setFeedback(e.error === 'not-allowed' ? 'Microphone blocked' : 'Voice error')
    rec.onend = () => setListening(false)

    recognitionRef.current = rec
    return () => { try { rec.abort() } catch { /* noop */ } }
  }, [supported, navigate])

  const toggle = useCallback(() => {
    const rec = recognitionRef.current
    if (!rec) return
    if (listening) {
      rec.stop()
      setListening(false)
    } else {
      setFeedback('Listening... say a page name')
      try {
        rec.start()
        setListening(true)
      } catch {
        /* already started */
      }
    }
  }, [listening])

  return { supported: !!supported, listening, toggle, lastHeard, feedback }
}
