import { asyncHandler } from '../utils/asyncHandler.js'
import { ok } from '../utils/ApiResponse.js'
import * as assistant from '../services/assistantService.js'

/** POST /api/assistant/chat  -> { reply, source } */
export const chat = asyncHandler(async (req, res) => {
  const { reply, source } = await assistant.chat(req.body.messages)
  return ok(res, { reply, source }, 'OK')
})
