import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export class ApiError extends Error {
  constructor(public status: ContentfulStatusCode, public code: string, message: string, public fields?: Record<string, string>) {
    super(message)
  }
}
export const notFound = (message = 'Introuvable') => new ApiError(404, 'not_found', message)
export const forbidden = (message = 'Accès refusé') => new ApiError(403, 'forbidden', message)
export const unauthorized = (message = 'Connexion requise') => new ApiError(401, 'unauthorized', message)
export const conflict = (code: string, message: string) => new ApiError(409, code, message)
export const badRequest = (code: string, message: string, fields?: Record<string, string>) => new ApiError(400, code, message, fields)

export function errorHandler(err: Error, c: Context) {
  if (err instanceof ApiError) return c.json({ error: { code: err.code, message: err.message, fields: err.fields } }, err.status)
  if (err instanceof HTTPException) return c.json({ error: { code: 'http_error', message: err.message } }, err.status)
  console.error(err)
  return c.json({ error: { code: 'internal', message: 'Erreur interne' } }, 500)
}

/** Hook pour zValidator : renvoie { error: { code: 'validation', fields } } */
export function validationHook(result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }, c: Context) {
  if (!result.success) {
    const fields: Record<string, string> = {}
    for (const issue of result.error!.issues) fields[issue.path.map(String).join('.') || '_'] = issue.message
    return c.json({ error: { code: 'validation', message: 'Certains champs sont invalides', fields } }, 400)
  }
}
