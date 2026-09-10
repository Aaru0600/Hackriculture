/**
 * KrishiAI assistant. Proxies to any OpenAI-compatible chat-completions API
 * when ASSISTANT_API_KEY is set; otherwise answers from a small rule-based
 * farming helper so the feature works with zero external setup.
 *
 * The API key lives only here (backend env) - React never sees it.
 */
import axios from 'axios'
import { env } from '../config/env.js'

const SYSTEM_PROMPT = `You are KrishiAI, a concise assistant for Indian farmers inside the HACKRICULTURE app.
- Answer in simple, practical language. Keep replies under ~120 words unless asked for detail.
- Cover crops, soil, fertilizer, irrigation, weather risk, pests and government schemes at a general level.
- You are NOT a substitute for a local agricultural officer or a soil-lab test - say so when advice could affect money or crop health.
- Never invent specific prices, subsidy amounts or dosages as guarantees; give typical ranges and tell the user to verify locally.
- If asked about the app: it has Crop Yield Prediction, Crop Recommendation, Fertilizer, Smart Irrigation, Weather Intelligence and a farming history page.`

const FALLBACK_RULES = [
  { re: /\b(hello|hi|hey|namaste|namaskar)\b/i, reply: 'Namaste! I can help with crops, soil, fertilizer, irrigation and weather questions. What would you like to know?' },
  { re: /\byield\b/i, reply: 'For a yield estimate, open **Crop Yield Prediction** and enter your crop, state and farm size (soil and weather auto-fill from your location). The estimate is a data-backed guide - confirm with a local expert.' },
  { re: /\b(which crop|what crop|recommend|suitab)\b/i, reply: 'Use **Crop Recommendation** - enter your soil test (or auto-fill from location) and it ranks the crops best suited to your conditions. Always cross-check seed availability and market demand locally.' },
  { re: /\b(fertil|urea|dap|npk|nutrient)\b/i, reply: 'Open **Fertilizer** and enter your soil N-P-K and pH. It compares them to the recommended dose for your crop and suggests Urea / DAP / MOP quantities. Split nitrogen into 2-3 applications and always get a fresh soil test first.' },
  { re: /\b(irrigat|water|moisture)\b/i, reply: 'Use **Smart Irrigation** - it rates your field\'s need (Low/Medium/High) and estimates water depth and timing. Skip or reduce irrigation when heavy rain is forecast, and check soil moisture by hand in the root zone.' },
  { re: /\b(weather|rain|forecast|temperature)\b/i, reply: 'The **Weather Intelligence** page shows current conditions and a 7-day forecast for your location, plus farming alerts (heavy rain, heat stress, low moisture).' },
  { re: /\b(pest|disease|insect|fungus)\b/i, reply: 'For pests: identify the insect or symptom first, use resistant varieties and crop rotation, and prefer need-based spraying. For a confirmed diagnosis and safe chemical dose, contact your nearest Krishi Vigyan Kendra (KVK).' },
  { re: /\b(scheme|subsidy|pm-?kisan|loan|insurance)\b/i, reply: 'Central schemes include PM-KISAN (income support), PMFBY (crop insurance) and the Soil Health Card. Amounts and eligibility change - check pmkisan.gov.in or your block agriculture office for current details.' },
]

function ruleBasedReply(userText) {
  for (const rule of FALLBACK_RULES) if (rule.re.test(userText)) return rule.reply
  return (
    'I can help with crop choice, yield, fertilizer, irrigation, weather and general farming questions. '
    + 'Try asking e.g. "which crop suits my soil?" or "how much urea for wheat?". '
    + 'For anything that affects money or crop health, confirm with your local agricultural officer.'
  )
}

/**
 * @param {{role:'user'|'assistant', content:string}[]} messages
 * @returns {Promise<{reply:string, source:'llm'|'rules'}>}
 */
export async function chat(messages) {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? ''

  if (!env.ASSISTANT_API_KEY) {
    return { reply: ruleBasedReply(lastUser), source: 'rules' }
  }

  try {
    const { data } = await axios.post(
      env.ASSISTANT_API_URL,
      {
        model: env.ASSISTANT_MODEL,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.4,
        max_tokens: 500,
      },
      {
        timeout: env.ASSISTANT_TIMEOUT_MS,
        headers: {
          Authorization: `Bearer ${env.ASSISTANT_API_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    )
    const reply = data?.choices?.[0]?.message?.content?.trim()
    if (reply) return { reply, source: 'llm' }
    return { reply: ruleBasedReply(lastUser), source: 'rules' }
  } catch {
    // network / quota / bad key -> degrade gracefully
    return { reply: ruleBasedReply(lastUser), source: 'rules' }
  }
}
