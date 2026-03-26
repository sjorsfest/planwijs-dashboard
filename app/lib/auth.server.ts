import { redirect } from "react-router"
import { extractToken } from "~/lib/api"

export type AuthContext = {
  token: string
  userId: string
}

function decodeBase64Url(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
    const padding = "=".repeat((4 - normalized.length % 4) % 4)
    return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8")
  } catch {
    return null
  }
}

function extractJwtSubject(token: string): string | null {
  const [, payloadSegment] = token.split(".")
  if (!payloadSegment) return null

  const payload = decodeBase64Url(payloadSegment)
  if (!payload) return null

  try {
    const parsed = JSON.parse(payload) as { sub?: unknown }
    return typeof parsed.sub === "string" && parsed.sub.length > 0 ? parsed.sub : null
  } catch {
    return null
  }
}

export function getAuthContext(request: Request): AuthContext | null {
  const token = extractToken(request.headers.get("Cookie") || "")
  if (!token) return null

  const userId = extractJwtSubject(token)
  if (!userId) return null

  return { token, userId }
}

export function requireAuthContext(request: Request): AuthContext {
  const auth = getAuthContext(request)
  if (!auth) {
    throw redirect("/login")
  }
  return auth
}
