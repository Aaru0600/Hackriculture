/**
 * Explainer content for each platform feature, shown at /learn/<slug>.
 * Linked from the landing-page feature grid. Plain English for now - these
 * longer docs still need a regional-language pass.
 */
import { PATHS } from '@/routes/paths'

export const FEATURE_DOCS = {
  yield: {
    slug: 'yield',
    title: 'Crop Yield Prediction',
    tagline: 'A data-backed estimate of how much your field is likely to produce, in tonnes per hectare.',
    cta: { label: 'Open Crop Yield Prediction', to: PATHS.cropPrediction },
    sections: [
      { heading: 'What it does', body: 'You enter your crop, state, season and farm size. Soil and weather values fill in automatically from your location (or you can type your own soil-test numbers). The model returns a predicted yield, a likely range, a reliability score, the risk level and the factors moving the estimate.' },
      { heading: 'How the model works', body: 'The core is a gradient-boosting model trained on real Indian state-year crop statistics (1997-2020). It learns the typical yield for a crop in a region and season. A separate transparent agronomic layer then nudges that number up or down for your specific soil pH, nutrients, temperature and growth stage.' },
      { heading: 'How to read the result', body: 'The big number is the central estimate; the range around it reflects model uncertainty. The "model score" is how consistent the model is for your inputs - it is NOT a probability of hitting that yield. "Rainfall vs yield" and "Temperature vs yield" charts show how the estimate would change if that one factor changed.' },
      { heading: 'Limits', body: 'The regional data has no plot-level soil chemistry, so it predicts a regional average that the agronomic layer personalises only roughly. Treat it as planning guidance, and confirm with a local agricultural officer and a fresh soil test before making decisions that cost money.' },
    ],
  },
  cropReco: {
    slug: 'cropReco',
    title: 'Crop Recommendation',
    tagline: 'Which crops best match your soil and climate right now.',
    cta: { label: 'Open Crop Recommendation', to: PATHS.cropRecommendation },
    sections: [
      { heading: 'What it does', body: 'From your soil nitrogen, phosphorus, potassium and pH plus typical season temperature, humidity and rainfall, it ranks 22 crops by how well your conditions suit them, and shows the top matches with expected yield, water need and growing duration.' },
      { heading: 'How the model works', body: 'A Random Forest classifier trained on ~2,200 labelled samples of "these conditions grew this crop well". It outputs a probability for every crop; we show the highest few as the recommendation and the next best as alternatives. On its test data it is right about 99% of the time and the correct crop is in the top three every time.' },
      { heading: 'How to use it', body: 'Use it early in the season when you are still deciding what to sow. Cross-check the suggestions against seed and input availability, market demand in your area, and your own experience - the model only sees soil and weather.' },
      { heading: 'Limits', body: 'It ignores price, pests, irrigation access and rotation history. The "suitability %" is a model score, not a guarantee of success.' },
    ],
  },
  fertilizer: {
    slug: 'fertilizer',
    title: 'Fertilizer Recommendation',
    tagline: 'Turn your soil test into a simple fertiliser plan.',
    cta: { label: 'Open Fertilizer', to: PATHS.fertilizer },
    sections: [
      { heading: 'What it does', body: 'You enter your soil N-P-K and pH and pick the crop. It compares your soil against the recommended dose for that crop, works out the gap for each nutrient, and converts each gap into a quantity of a common straight fertiliser (Urea for N, DAP for P, MOP for K), with timing and application-method notes.' },
      { heading: 'How it works', body: 'This is a transparent rule-based calculator, not a machine-learning model - the deficit is (recommended dose minus your soil value), and the fertiliser quantity is the deficit divided by that product\'s nutrient content. If your pH is very low or very high it also suggests lime or gypsum.' },
      { heading: 'How to use it', body: 'Split the nitrogen into two or three applications through the season rather than all at once. Place phosphorus near the root zone. Re-test your soil after the crop to see how the numbers moved.' },
      { heading: 'Limits', body: 'Doses are typical, not field-specific. Always base the final plan on a lab soil test and local extension advice - over-application wastes money and can harm the soil and nearby water.' },
    ],
  },
  irrigation: {
    slug: 'irrigation',
    title: 'Smart Irrigation',
    tagline: 'How much to water, and when.',
    cta: { label: 'Open Smart Irrigation', to: PATHS.irrigation },
    sections: [
      { heading: 'What it does', body: 'From your crop, growth stage, soil moisture and weather, it rates the field\'s irrigation need as Low, Medium or High, then estimates a net and gross water depth (mm), how many days until the next irrigation, an approximate run time, and whether to hold off because rain is forecast.' },
      { heading: 'How it works', body: 'A Random Forest classifier trained on ~10,000 records predicts the need class. A transparent rule layer then converts that class into water depth using published crop-water requirements, adjusts for your irrigation method\'s efficiency (drip vs sprinkler vs flood) and subtracts expected rainfall.' },
      { heading: 'How to use it', body: 'Check soil moisture by hand in the root zone before you act. If heavy rain is forecast within a day or two, follow the "skip / reduce" advice. Drip runs longer at lower flow than flood - the run-time figure assumes a rough delivery rate, so calibrate it to your pump.' },
      { heading: 'Limits', body: 'The depth and schedule are a rule of thumb layered on a model, not a full water-balance calculation. Adjust to what you see in your own field.' },
    ],
  },
  weather: {
    slug: 'weather',
    title: 'Weather Intelligence',
    tagline: 'Current conditions, a 7-day forecast, and farming alerts for your exact location.',
    cta: { label: 'Open Weather', to: PATHS.weather },
    sections: [
      { heading: 'What it does', body: 'Pick your location once and the Weather page shows temperature, humidity, wind, rainfall and rain probability now, plus a 7-day daily forecast. It also derives farming alerts - heavy rain expected, heat stress, low soil moisture, possible crop stress.' },
      { heading: 'Where the data comes from', body: 'Open-Meteo, a free public weather service. No account or key is needed. The same location is reused to auto-fill temperature and humidity in the prediction forms.' },
      { heading: 'How to use it', body: 'Use the forecast to time sowing, spraying, fertiliser application and irrigation. Act on the alerts - for example, delay irrigation or fertiliser if heavy rain is coming.' },
      { heading: 'Limits', body: 'A forecast is a probability, not a certainty, and gets less reliable further out. Local terrain can make your field differ from the grid forecast.' },
    ],
  },
  assistant: {
    slug: 'assistant',
    title: 'KrishiAI Assistant',
    tagline: 'Ask farming questions in plain language - by text or voice.',
    cta: { label: 'Go to the dashboard', to: PATHS.dashboard },
    sections: [
      { heading: 'What it does', body: 'The chat bubble at the bottom-left of every signed-in page answers questions about crops, soil, fertiliser, irrigation, weather, pests and government schemes, and points you to the right tool in the app. You can type or tap the microphone to speak your question.' },
      { heading: 'How it works', body: 'Your message goes to the HACKRICULTURE backend, which asks a language model to reply as a concise farming assistant. If no model is configured, a built-in rule-based helper answers common questions. Your API key, if any, stays on the server - never in the browser.' },
      { heading: 'How to use it', body: 'Ask specific questions: "how much urea for wheat at tillering?", "which crop suits sandy soil with low rainfall?", "is it safe to spray before rain?". The last 20 messages are kept on your device so the conversation has context.' },
      { heading: 'Limits', body: 'It gives general guidance and typical ranges, not a diagnosis or a guaranteed dose. For anything that affects money or crop health, confirm with your local agricultural officer or KVK.' },
    ],
  },
  multilingual: {
    slug: 'multilingual',
    title: 'Multilingual & Voice',
    tagline: 'Use the whole app in your language, and navigate by voice.',
    cta: { label: 'Go to the dashboard', to: PATHS.dashboard },
    sections: [
      { heading: 'What it does', body: 'The interface is available in English, Hindi, Punjabi, Marathi, Tamil, Telugu and Bengali. Switch language from the selector in the top bar; your choice is remembered. The microphone button in the top bar lets you jump between pages hands-free - say "crop prediction", "weather", "history".' },
      { heading: 'How it works', body: 'Text comes from complete translation files for each language, with English as the fallback for any gap. Voice navigation uses your browser\'s built-in speech recognition - nothing is recorded or uploaded.' },
      { heading: 'How to use it', body: 'Set your preferred language once. For voice, tap the mic, wait for "listening", then say the page name. The chat assistant also accepts spoken questions.' },
      { heading: 'Limits', body: 'The regional translations are machine-assisted and still being reviewed by native speakers. Voice recognition needs a supported browser (recent Chrome or Edge) and microphone permission.' },
    ],
  },
  history: {
    slug: 'history',
    title: 'Farming History',
    tagline: 'Every prediction and recommendation you have run, in one place.',
    cta: { label: 'Open History', to: PATHS.history },
    sections: [
      { heading: 'What it does', body: 'The History page lists your past yield predictions and your crop, fertiliser and irrigation recommendations, newest first, with the date and the key result. Open any row to see the full inputs and output. A yield-trend chart appears once you have a few predictions.' },
      { heading: 'How it works', body: 'Each time you run a tool while signed in, the backend stores the inputs and the result against your account. The History page reads them back, filtered to just your records.' },
      { heading: 'How to use it', body: 'Use it to compare estimates across seasons, to remember what you entered last time, and to see whether your predicted yields are trending up or down as you change practices.' },
      { heading: 'Limits', body: 'History is saved only for runs made while signed in. In offline / demo mode nothing is stored.' },
    ],
  },
}

export const FEATURE_DOC_LIST = Object.values(FEATURE_DOCS)
