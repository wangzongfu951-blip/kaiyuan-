#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { closeHotspotsDb, getHotspotById, listHotspots } from '../../src/hotspots-local.js'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

function argument(name) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const outputDir = path.resolve(argument('output') || path.join(projectRoot, 'public', 'data'))
const PUBLIC_FIELDS = [
  'id',
  'hotTerm',
  'collocation',
  'theme',
  'meaning',
  'usageContext',
  'modelSentence',
  'examFunction',
  'commonErrors',
  // Keep the audit trail in the static snapshot.  The public template may
  // choose not to show year/source metadata, but detail views need it to
  // explain where a collocation came from and to render all linked sources.
  'sourceKeys',
  'year',
  'sourceEvidence',
]

function readAll(preset) {
  const rows = []
  let offset = 0
  let total = null
  do {
    const page = listHotspots({ preset, limit: 100, offset })
    total ??= Number(page.total)
    rows.push(...page.rows)
    offset += page.rows.length
    if (page.rows.length === 0) break
  } while (rows.length < total)
  if (total === null || rows.length !== total) {
    throw new Error(`hotspot export pagination mismatch for ${preset}: expected ${total}, got ${rows.length}`)
  }
  return { total, rows }
}

function toPublicRow(row, preset) {
  const publicRow = Object.fromEntries(PUBLIC_FIELDS.map((field) => [field, typeof row[field] === 'string' ? row[field].trim() : row[field] ?? '']))
  if (!publicRow.id || !publicRow.hotTerm || !publicRow.collocation || !publicRow.meaning || !publicRow.usageContext || !publicRow.modelSentence) {
    throw new Error(`missing required public hotspot field in ${preset}: ${publicRow.id || '(unknown id)'}`)
  }
  if (!Array.isArray(publicRow.sourceEvidence)) {
    throw new Error(`source evidence must be an array in ${preset}: ${publicRow.id}`)
  }
  return publicRow
}

function sourceEvidenceFor(row) {
  const detail = row.id ? getHotspotById(row.id) : null
  const sources = Array.isArray(detail?.sources) ? detail.sources : []
  return sources.map((source) => ({
    sourceKey: String(source.sourceKey ?? source.key ?? '').trim(),
    title: String(source.sourceTitle ?? source.title ?? '').trim(),
    organization: String(source.sourceOrg ?? source.organization ?? '').trim(),
    date: String(source.sourceDate ?? source.date ?? '').trim(),
    url: String(source.sourceUrl ?? source.url ?? '').trim(),
    authorityLevel: String(source.authorityLevel ?? '').trim(),
    verificationStatus: String(source.verificationStatus ?? '').trim(),
    // The corpus stores a reviewed model sentence rather than a full article
    // archive.  Labeling it as a database example avoids presenting a
    // paraphrase as a verbatim media excerpt while retaining the exact source.
    excerpt: String(row.modelSentence ?? '').trim(),
    highlightTerm: String(row.hotTerm ?? '').trim(),
    evidenceKind: 'database_example',
    note: String(source.sourceUrl ?? source.url ?? '').trim()
      ? '数据库保留审校例句和权威来源元数据；公开文章正文以来源页面为准。'
      : '数据库保留审校例句和权威来源元数据；当前未保留稳定公开链接，例句不冒充文章原文。',
  }))
}

function validateRows(rows, preset, expectedTotal) {
  if (rows.length !== expectedTotal) throw new Error(`${preset} export count must be ${expectedTotal}, got ${rows.length}`)
  const ids = new Set()
  const phrases = new Set()
  for (const row of rows) {
    if (ids.has(row.id)) throw new Error(`duplicate hotspot id in ${preset}: ${row.id}`)
    ids.add(row.id)
    const phraseKey = `${row.hotTerm}\u0000${row.collocation}`
    if (phrases.has(phraseKey)) throw new Error(`duplicate hotspot phrase in ${preset}: ${row.hotTerm} / ${row.collocation}`)
    phrases.add(phraseKey)
  }
}

function writeJson(fileName, preset, expectedTotal) {
  const { total, rows } = readAll(preset)
  const publicRows = rows.map((row) => toPublicRow({ ...row, sourceEvidence: sourceEvidenceFor(row) }, preset))
  validateRows(publicRows, preset, expectedTotal)
  const payload = {
    version: 2,
    preset,
    total,
    generatedAt: new Date().toISOString(),
    rows: publicRows,
  }
  fs.mkdirSync(outputDir, { recursive: true })
  const outputPath = path.join(outputDir, fileName)
  const temporaryPath = `${outputPath}.tmp-${process.pid}`
  fs.writeFileSync(temporaryPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  fs.renameSync(temporaryPath, outputPath)
  return { file: outputPath, total }
}

try {
  const results = [
    writeJson('hotspots-image.json', 'image', 66),
    writeJson('hotspots-full.json', '', 667),
  ]
  console.log(JSON.stringify({ outputDir, results }, null, 2))
} finally {
  closeHotspotsDb()
}
