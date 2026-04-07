import { redirect } from "react-router"
import { getSession, commitSession, destroySession } from "~/lib/session.server"

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

export async function getAuthContext(request: Request): Promise<AuthContext | null> {
  const session = await getSession(request.headers.get("Cookie"))
  const token = session.get("access_token") as string | undefined
  if (!token) return null

  const userId = extractJwtSubject(token)
  if (!userId) return null

  return { token, userId }
}

export async function requireAuthContext(request: Request): Promise<AuthContext> {
  const auth = await getAuthContext(request)
  if (!auth) {
    throw redirect("/login")
  }
  return auth
}

export async function createUserSession(token: string, redirectTo: string) {
  const session = await getSession()
  session.set("access_token", token)
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  })
}

export async function logout(request: Request) {
  const session = await getSession(request.headers.get("Cookie"))
  return redirect("/login", {
    headers: {
      "Set-Cookie": await destroySession(session),
    },
  })
}
