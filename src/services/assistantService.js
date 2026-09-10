/**
 * KrishiAI assistant client. Real mode calls the Node backend, which holds the
 * LLM key (or answers with a rule-based helper). Mock mode uses a tiny local
 * responder so the widget works offline.
 */
import { USE_MOCKS, request } from './apiClient'

const MOCK_RULES = [
  [/\b(hi|hello|namaste)\b/i, 'Namaste! Ask me about crops, soil, fertilizer, irrigation or weather.'],
  [/\byield\b/i, 'Open Crop Yield Prediction, pick your crop, state and farm size - soil and weather auto-fill from your location.'],
  [/\bcrop|recommend|suitab/i, 'Use Crop Recommendation - it ranks the crops best suited to your soil and climate.'],
  [/\bfertil|urea|dap|npk\b/i, 'Open Fertilizer, enter your soil N-P-K and pH, and it suggests Urea / DAP / MOP quantities for your crop.'],
  [/\birrigat|water|moisture\b/i, 'Smart Irrigation rates your field need (Low/Med/High) and estimates water depth and timing.'],
  [/\bweather|rain|forecast\b/i, 'The Weather page shows current conditions, a 7-day forecast and farming alerts for your location.'],
]

function mockReply(text) {
  for (const [re, r] of MOCK_RULES) if (re.test(text)) return r
  return 'I can help with crop choice, yield, fertilizer, irrigation and weather. For advice that affects money or crop health, confirm with your local agricultural officer.'
}

/**
 * @param {{role:'user'|'assistant', content:string}[]} messages
 * @returns {Promise<{reply:string, source:'llm'|'rules'|'mock'}>}
 */
export async function chat(messages) {
  if (!USE_MOCKS) {
    const body = await request('/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: messages.slice(-20) }),
    })
    return body.data
  }
  await new Promise((r) => setTimeout(r, 400))
  const last = [...messages].reverse().find((m) => m.role === 'user')?.content ?? ''
  return { reply: mockReply(last), source: 'mock' }
}
