import { useLoaderData } from "react-router"
import { CalendarDays, BookOpen, ListChecks, LayoutGrid } from "lucide-react"
import { Button } from "~/components/ui/button"
import { getApiUrl } from "~/lib/api"
import type { Route } from "./+types/login"

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Inloggen — Planwijs" },
    { name: "description", content: "Log in op Planwijs om je lesplannen te beheren." },
  ]
}

export async function loader({ request }: Route.LoaderArgs) {
  const origin = new URL(request.url).origin
  const redirectUri = `${origin}/auth/callback`
  return { apiUrl: getApiUrl(), redirectUri }
}

export default function LoginPage() {
  const { apiUrl, redirectUri } = useLoaderData<typeof loader>()

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[0.9fr_3.1fr]">

      {/* ── Left: branding bento ── */}
      <div className="hidden lg:flex flex-col border-r-2 border-black min-h-screen">

        {/* Logo bar */}
        <div className="flex items-center gap-3 px-6 h-16 border-b-2 border-black bg-white flex-shrink-0">
          <div className="w-7 h-7 flex items-center justify-center">
            <CalendarDays className="w-6 h-6 text-black" />
          </div>
          <span className="font-bold text-sm tracking-tight">Planwijs</span>
        </div>

        {/* Hero — pink, headline anchored to bottom */}
        <div className="flex-1 flex flex-col justify-end p-6 bg-[#f9d5d3]">
          <h1 className="text-3xl font-black leading-[1.05] text-black">
            Jouw lessen,<br />altijd<br />overzichtelijk.
          </h1>
          <p className="mt-3 text-xs text-black/60 leading-relaxed">
            De lesplannerapp voor docenten.
          </p>
        </div>

        {/* Feature bars — stacked, full width */}
        <div className="flex flex-col border-t-2 border-black flex-shrink-0">
          {[
            { icon: CalendarDays, label: "Kalenderoverzicht", bg: "#c8ead8" },
            { icon: BookOpen,     label: "Lesplannen aanmaken", bg: "#c5d9f5" },
            { icon: ListChecks,   label: "Dagelijks overzicht", bg: "#dcd3f0" },
            { icon: LayoutGrid,   label: "Rustige omgeving",   bg: "#fdf4c4" },
          ].map(({ icon: Icon, label, bg }, i, arr) => (
            <div
              key={i}
              className={["flex items-center gap-4 px-6 py-5", i < arr.length - 1 ? "border-b-2 border-black" : ""].join(" ")}
              style={{ backgroundColor: bg }}
            >
              <div className="w-7 h-7 border-2 border-black bg-white flex items-center justify-center flex-shrink-0">
                <Icon className="w-3.5 h-3.5" />
              </div>
              <p className="text-sm font-semibold">{label}</p>
            </div>
          ))}
        </div>

      </div>

      {/* ── Right: login ── */}
      <div className="flex flex-col min-h-screen bg-white">

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 px-6 h-16 border-b-2 border-black">
          <div className="w-8 h-8 bg-black flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">Planwijs</span>
        </div>

        {/* Form — vertically centered */}
        <div className="flex-1 flex items-center justify-center px-12 py-16">
          <div className="w-full max-w-sm">

            <p className="text-xs font-bold uppercase tracking-widest text-black/30 mb-8">
              Inloggen
            </p>

            <h2 className="text-5xl font-black leading-[1.0] text-black mb-3">
              Welkom<br />terug.
            </h2>
            <p className="text-sm text-black/50 mb-12 leading-relaxed">
              Log in om je lesrooster te bekijken en bij te houden.
            </p>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full gap-3 h-12 text-sm"
            >
              <a href={`${apiUrl}/auth/google/start?redirect_uri=${encodeURIComponent(redirectUri)}`}>
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Doorgaan met Google
              </a>
            </Button>

            <p className="mt-6 text-xs text-black/40 leading-relaxed">
              Door in te loggen ga je akkoord met onze{" "}
              <span className="underline underline-offset-2 cursor-pointer hover:text-black">Gebruiksvoorwaarden</span>
              {" "}en{" "}
              <span className="underline underline-offset-2 cursor-pointer hover:text-black">Privacybeleid</span>.
            </p>

          </div>
        </div>

        {/* Footer */}
        <div className="px-12 py-5 border-t-2 border-black bg-[#f5f0e8] flex-shrink-0">
          <p className="text-xs text-black/40">© {new Date().getFullYear()} Planwijs</p>
        </div>

      </div>
    </div>
  )
}
