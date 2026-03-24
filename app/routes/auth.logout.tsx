import { redirect } from "react-router"

export async function loader() {
  return redirect("/login", {
    headers: {
      "Set-Cookie": "access_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
    },
  })
}

export default function AuthLogout() {
  return null
}
