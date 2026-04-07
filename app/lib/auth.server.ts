import { redirect } from "react-router"
import { getSession, commitSession, destroySession } from "~/lib/session.server"

export type AuthContext = {
  token: string
}

export async function getAuthContext(request: Request): Promise<AuthContext | null> {
  const session = await getSession(request.headers.get("Cookie"))
  const token = session.get("access_token") as string | undefined
  if (!token) return null

  return { token }
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
