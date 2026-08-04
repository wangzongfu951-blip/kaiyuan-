import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDirectory = path.join(projectRoot, 'dist')
const indexPath = path.join(distDirectory, 'index.html')
const fallbackPath = path.join(distDirectory, '404.html')

if (!fs.existsSync(indexPath)) throw new Error(`Vite output is missing: ${indexPath}`)
fs.copyFileSync(indexPath, fallbackPath)
console.log(`[pages] copied ${indexPath} to ${fallbackPath}`)
