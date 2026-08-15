import { selectionArtwork, type Artwork, type Selection } from '../domain/types'

const LEGACY_IMAGE_PROXY = 'https://30-anime-recommendations-proxy.30-anime-recommendation.workers.dev'

/**
 * Keep the editor on the official image URL so normal previews are never held
 * hostage by a proxy. PNG export uses the v0.1 image Worker, whose CORS response
 * lets the browser safely draw Bangumi character images to Canvas.
 */
export function posterArtwork(selection?: Selection): Artwork | undefined {
  const artwork = selectionArtwork(selection)
  if (!artwork || selection?.source !== 'bangumi-api' || selection.localArtwork) return artwork
  return { ...artwork, imageUrl: `${LEGACY_IMAGE_PROXY}/image/${selection.kind}/${selection.id}?type=grid` }
}
