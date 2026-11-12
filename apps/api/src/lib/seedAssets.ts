import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const ASSETS = fileURLToPath(new URL('../../seed-assets/', import.meta.url))
const UPLOADS = fileURLToPath(new URL('../../uploads/seed/', import.meta.url))

/** Copie les images de demo dans uploads/seed (idempotent). Utile sur un hebergeur au disque ephemere. */
export function copySeedAssets() {
  mkdirSync(UPLOADS, { recursive: true })
  for (const dir of [ASSETS, ASSETS + 'photos/']) {
    for (const f of readdirSync(dir)) {
      if (!/\.(jpe?g|png|webp)$/i.test(f)) continue
      if (!existsSync(UPLOADS + f)) copyFileSync(dir + f, UPLOADS + f)
    }
  }
}
