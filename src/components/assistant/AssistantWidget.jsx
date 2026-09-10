import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageCircle, X, Send, Sparkles, Mic, Loader2 } from 'lucide-react'
import { chat } from '@/services/assistantService'
import { cn } from '@/lib/cn'

const STORAGE_KEY = 'hk_assistant_thread'

function loadThread() {
  try {
    const t = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    return Array.isArray(t) ? t.slice(-20) : []
  } catch {
    return []
  }
}

export function AssistantWidget() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState(loadThread)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const listRef = useRef(null)
  const recRef = useRef(null)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-20))) } catch { /* noop */ }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  // speech-to-text for the question box
  useEffect(() => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Ctor) return
    const rec = new Ctor()
    rec.continuous = false
    rec.interimResults = false
    rec.lang = document.documentElement.lang || 'en-IN'
    rec.onresult = (e) => setDraft((d) => (d ? d + ' ' : '') + e.results[0][0].transcript)
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    return () => { try { rec.abort() } catch { /* noop */ } }
  }, [])

  const micToggle = () => {
    const rec = recRef.current
    if (!rec) return
    if (listening) { rec.stop(); setListening(false) }
    else { try { rec.start(); setListening(true) } catch { /* noop */ } }
  }

  const send = async (text) => {
    const content = (text ?? draft).trim()
    if (!content || busy) return
    const next = [...messages, { role: 'user', content }]
    setMessages(next)
    setDraft('')
    setBusy(true)
    try {
      const { reply, source } = await chat(next)
      setMessages((m) => [...m, { role: 'assistant', content: reply, source }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: t('assistant.error'), source: 'error' }])
    } finally {
      setBusy(false)
    }
  }

  const suggestions = t('assistant.suggestions', { returnObjects: true })

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t('assistant.title')}
        className={cn(
          'fixed bottom-5 left-5 z-40 grid h-14 w-14 place-items-center rounded-full text-white shadow-lg transition-transform',
          'bg-gradient-to-br from-brand-600 to-harvest-500 hover:scale-105 active:scale-95',
        )}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {open && (
        <div className="fixed bottom-24 left-5 z-40 flex h-[32rem] max-h-[75vh] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
          <div className="flex items-center gap-2 border-b border-line bg-gradient-to-r from-brand-600 to-harvest-500 px-4 py-3 text-white">
            <Sparkles size={16} />
            <span className="text-sm font-semibold">{t('assistant.title')}</span>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="px-1 text-xs text-muted">{t('assistant.intro')}</p>
                {Array.isArray(suggestions) && suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="block w-full rounded-lg border border-line bg-canvas px-3 py-2 text-left text-xs text-ink hover:bg-brand-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm',
                    m.role === 'user'
                      ? 'bg-brand-600 text-white'
                      : 'bg-canvas text-ink',
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-canvas px-3 py-2 text-sm text-muted">
                  <Loader2 size={14} className="inline animate-spin" /> {t('assistant.thinking')}
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send() }}
            className="flex items-center gap-2 border-t border-line px-3 py-2.5"
          >
            <button
              type="button"
              onClick={micToggle}
              aria-label={t('assistant.speak')}
              className={cn(
                'grid h-9 w-9 shrink-0 place-items-center rounded-full',
                listening ? 'bg-danger text-white animate-pulse' : 'bg-black/5 text-ink/70 hover:bg-black/10',
              )}
            >
              <Mic size={16} />
            </button>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('assistant.placeholder')}
              className="h-9 flex-1 rounded-full border border-line bg-white px-3.5 text-sm outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 text-white disabled:opacity-40"
            >
              <Send size={15} />
            </button>
          </form>
          <p className="px-3 pb-2 text-[10px] leading-tight text-muted">{t('assistant.disclaimer')}</p>
        </div>
      )}
    </>
  )
}
