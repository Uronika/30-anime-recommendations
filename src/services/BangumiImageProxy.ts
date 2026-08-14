import { selectionArtwork, type Artwork, type Selection } from '../domain/types'

export type BangumiImageKind = 'subject' | 'character'

/**
 * Forks can override this public endpoint during their Vite build without
 * exposing any secret to clients.
 */
const DEFAULT_IMAGE_PROXY_URL = 'https://30-anime-recommendations-image-proxy.30-anime-recommendation.workers.dev'
const configuredBaseUrl = import.meta.env.VITE_BANGUMI_IMAGE_PROXY_URL?.trim() || DEFAULT_IMAGE_PROXY_URL

function baseUrl() {
  return configuredBaseUrl?.replace(/\/+$/, '')
}

/**
 * Sends only a Bangumi record ID to the Worker. The Worker chooses the upstream
 * endpoint itself, so the browser cannot turn this into an arbitrary URL proxy.
 */
export function bangumiImageProxyUrl(kind: BangumiImageKind, id: number): string | undefined {
  const base = baseUrl()
  if (!base || !Number.isSafeInteger(id) || id < 1) return undefined
  return `${base}/image/${kind}/${id}?type=large`
}

/** Keeps backups on the official source URL while routing only on-screen/export use through the CORS relay. */
export function displayArtwork(selection?: Selection): Artwork | undefined {
  const artwork = selectionArtwork(selection)
  if (!artwork || selection?.source !== 'bangumi-api' || selection.localArtwork) return artwork
  return { ...artwork, imageUrl: bangumiImageProxyUrl(selection.kind, selection.id) ?? artwork.imageUrl }
}
