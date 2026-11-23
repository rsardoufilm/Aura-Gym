/**
 * Cloudflare Worker: expõe o Aura Gym em https://aurapro.uk/auragym.
 *
 * Os arquivos estáticos são atendidos pelo binding ASSETS do Workers Static Assets.
 * Somente /auragym/api/* chega a este Worker (assets.run_worker_first).
 * O prefixo público é removido antes de encaminhar a chamada à API Node externa.
 *
 * API_ORIGIN deve ser configurado em Workers > Settings > Variables and Secrets.
 * Exemplo: https://aura-gym-api-production.up.railway.app
 *
 * A API de origem deve usar ORIGIN=https://aurapro.uk e RP_ID=aurapro.uk.
 */
const APP_PREFIX = '/auragym'

function jsonError(status, error, detail) {
  return new Response(JSON.stringify({ error, detail }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export default {
  async fetch(request, env) {
    const incoming = new URL(request.url)

    // Guard rail: this Worker only handles the app's API prefix.
    if (
      incoming.pathname !== `${APP_PREFIX}/api` &&
      !incoming.pathname.startsWith(`${APP_PREFIX}/api/`)
    ) {
      return jsonError(404, 'not-found', 'Rota não atendida pelo Worker Aura Gym.')
    }

    if (!env.API_ORIGIN) {
      return jsonError(
        503,
        'api-not-configured',
        'Configure API_ORIGIN nas variáveis do Worker antes de habilitar login e sincronização.'
      )
    }

    let apiOrigin
    try {
      apiOrigin = new URL(env.API_ORIGIN)
    } catch {
      return jsonError(500, 'invalid-api-origin', 'API_ORIGIN não é uma URL válida.')
    }

    // Only HTTPS origins are allowed, and a path is not accepted to avoid ambiguous rewrites.
    if (
      apiOrigin.protocol !== 'https:' ||
      apiOrigin.pathname !== '/' ||
      apiOrigin.search ||
      apiOrigin.hash ||
      apiOrigin.hostname === incoming.hostname
    ) {
      return jsonError(
        500,
        'unsafe-api-origin',
        'API_ORIGIN deve ser uma origem HTTPS externa, sem caminho, query ou fragmento.'
      )
    }

    // Browser calls use /auragym/api/*; the existing Node API expects /api/*.
    const upstreamUrl = new URL(apiOrigin.origin)
    upstreamUrl.pathname = incoming.pathname.slice(APP_PREFIX.length) || '/'
    upstreamUrl.search = incoming.search

    const headers = new Headers(request.headers)
    headers.delete('host')
    headers.set('Origin', incoming.origin)
    headers.set('X-Forwarded-Host', incoming.host)
    headers.set('X-Forwarded-Proto', incoming.protocol.slice(0, -1))

    // Do not trust a client-supplied X-Forwarded-For value.
    const clientIp = request.headers.get('CF-Connecting-IP')
    if (clientIp) headers.set('X-Forwarded-For', clientIp)
    else headers.delete('X-Forwarded-For')

    try {
      const init = {
        method: request.method,
        headers,
        redirect: 'manual',
      }

      if (request.method !== 'GET' && request.method !== 'HEAD') {
        init.body = request.body
      }

      // Preserve upstream status, headers, cookies and streaming response body.
      return await fetch(new Request(upstreamUrl.toString(), init))
    } catch (error) {
      return jsonError(
        502,
        'api-upstream-unavailable',
        error instanceof Error ? error.message : 'Falha ao conectar à API do Aura Gym.'
      )
    }
  },
}
