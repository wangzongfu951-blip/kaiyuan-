export type HotspotStaticPreset = 'image' | 'full'

export interface HotspotSourceEvidence {
  sourceKey: string
  title: string
  organization: string
  date: string
  url: string
  authorityLevel: string
  verificationStatus: string
  excerpt: string
  highlightTerm: string
  evidenceKind: 'database_example' | string
  note: string
}

export interface HotspotStaticRow {
  id: string
  hotTerm: string
  collocation: string
  theme: string
  meaning: string
  usageContext: string
  modelSentence: string
  examFunction: string
  commonErrors: string
  sourceKeys?: string
  year?: number | null
  sourceEvidence?: HotspotSourceEvidence[]
}

interface HotspotStaticPayload {
  version: number
  preset: HotspotStaticPreset | ''
  total: number
  rows: HotspotStaticRow[]
}

function staticUrl(preset: HotspotStaticPreset): string {
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`
  return `${base}data/hotspots-${preset}.json`
}

export async function loadStaticHotspots(preset: HotspotStaticPreset): Promise<HotspotStaticRow[]> {
  const response = await fetch(staticUrl(preset), { cache: 'no-cache' })
  if (!response.ok) throw new Error(`static hotspot data request failed: ${response.status}`)
  const payload = await response.json() as HotspotStaticPayload
  if (!payload || !Array.isArray(payload.rows)) throw new Error('static hotspot data is invalid')
  return payload.rows
}
