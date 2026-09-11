import dns from 'node:dns'

const LOOKUP_TIMEOUT_MS = 4000

/**
 * Checks the email's domain actually has mail servers, catching typos like
 * "gmial.com" before we bother sending a verification link. Permissive by
 * design: only a definitive "no such domain / no MX records" answer fails
 * it - a DNS timeout or resolver hiccup never blocks registration.
 */
export function hasMxRecord(email) {
  const domain = String(email).split('@')[1]?.toLowerCase()
  if (!domain) return Promise.resolve(false)

  return new Promise((resolve) => {
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) { settled = true; resolve(true) }
    }, LOOKUP_TIMEOUT_MS)

    dns.resolveMx(domain, (err, addresses) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (err) {
        // ENOTFOUND / ENODATA = domain genuinely has no MX - anything else
        // (timeout, ESERVFAIL, offline resolver) is inconclusive, so allow it.
        resolve(err.code !== 'ENOTFOUND' && err.code !== 'ENODATA')
        return
      }
      resolve(Array.isArray(addresses) && addresses.length > 0)
    })
  })
}
