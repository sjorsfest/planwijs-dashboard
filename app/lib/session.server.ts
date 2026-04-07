import { createCookieSessionStorage } from "react-router"

const sessionSecret = process.env.SESSION_SECRET ?? "dev-session-secret"

const storage = createCookieSessionStorage({
  cookie: {
    name: "planwijs_session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [sessionSecret],
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24, // 24 hours
  },
})

export const { getSession, commitSession, destroySession } = storage
