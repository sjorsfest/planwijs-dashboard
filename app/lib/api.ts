import type { components } from "~/types/api.generated"

export type Event = components["schemas"]["Event"]
export type User = components["schemas"]["User"]

// Server-only — never imported directly in client components
const API_URL = process.env.API_URL || "http://localhost:8000"

export function getApiUrl(): string {
  return API_URL
}

/** Extract the access_token value from a Cookie header string. */
export function extractToken(cookieHeader: string): string | null {
  const match = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

function authHeader(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function getEvents(token: string | null): Promise<Event[]> {
  try {
    const res = await fetch(`${API_URL}/events/`, {
      headers: { "Content-Type": "application/json", ...authHeader(token) },
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function createEvent(
  data: { name: string; description?: string | null; planned_date: string },
  token: string | null
): Promise<Event | null> {
  try {
    const res = await fetch(`${API_URL}/events/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader(token) },
      body: JSON.stringify(data),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function deleteEvent(id: string, token: string | null): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/events/${id}`, {
      method: "DELETE",
      headers: authHeader(token),
    })
    return res.ok || res.status === 204
  } catch {
    return false
  }
}
