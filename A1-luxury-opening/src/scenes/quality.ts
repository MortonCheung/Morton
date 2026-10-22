import type { QualityTier } from '../types/opening'

/**
 * One quality decision per page load. Mobile keeps the core look (satin metal,
 * shaped reflections, contact shadow) and only pays less for geometry sampling
 * and shadow resolution.
 */
export function getQualityTier(width: number, pixelRatio: number): QualityTier {
  const mobile = width < 768
  const dpr = Math.min(pixelRatio || 1, 2)
  return mobile
    ? { name: 'mobile', maxDpr: Math.min(dpr, 2), shadowMapSize: 512, curveSegments: 12, bevelSegments: 3 }
    : { name: 'desktop', maxDpr: Math.min(dpr, 2), shadowMapSize: 1024, curveSegments: 16, bevelSegments: 4 }
}
