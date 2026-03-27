"use client"

import { useState } from "react"
import { useFetcher, useLoaderData } from "react-router"
import { AnimatePresence, motion } from "framer-motion"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  Trash2,
} from "lucide-react"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  getDay,
  addMonths,
  subMonths,
} from "date-fns"
import { nl } from "date-fns/locale"

import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Textarea } from "~/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog"
import { getEvents, createEvent, deleteEvent, extractToken } from "~/lib/api"
import type { Event } from "~/lib/api"
import type { Route } from "./+types/app.calendar"

// ─── Loader ────────────────────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  const token = extractToken(request.headers.get("Cookie") || "")
  const events = await getEvents(token)
  return { events }
}

// ─── Action ────────────────────────────────────────────────────────────────

export async function action({ request }: Route.ActionArgs) {
  const token = extractToken(request.headers.get("Cookie") || "")
  const formData = await request.formData()
  const intent = formData.get("intent")

  if (intent === "create") {
    const event = await createEvent(
      {
        name: formData.get("name") as string,
        description: (formData.get("description") as string) || null,
        planned_date: formData.get("planned_date") as string,
      },
      token
    )
    return { ok: !!event }
  }

  if (intent === "delete") {
    await deleteEvent(formData.get("id") as string, token)
    return { ok: true }
  }

  return { ok: false }
}

// ─── Meta ──────────────────────────────────────────────────────────────────

export function meta(_: Route.MetaArgs) {
  return [{ title: "Kalender — Planwijs" }]
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getPaddingDays(date: Date): number {
  const day = getDay(startOfMonth(date))
  return day === 0 ? 6 : day - 1
}

function toDateString(d: Date): string {
  return format(d, "yyyy-MM-dd")
}

const SOFT_EASE = [0.22, 1, 0.36, 1] as const
const WEEKDAYS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"]

// ─── Component ─────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { events } = useLoaderData<typeof loader>()
  const fetcher = useFetcher()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newEventDate, setNewEventDate] = useState(toDateString(new Date()))

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const paddingDays = getPaddingDays(currentMonth)

  const eventsForDay = (day: Date) =>
    events.filter((e) => e.planned_date === toDateString(day))

  const selectedEvents = eventsForDay(selectedDate)

  const isSubmitting =
    fetcher.state !== "idle" && fetcher.formData?.get("intent") === "create"

  if (fetcher.state === "idle" && fetcher.data?.ok && dialogOpen) {
    setDialogOpen(false)
  }

  const openCreate = (day?: Date) => {
    setNewEventDate(toDateString(day ?? selectedDate))
    setDialogOpen(true)
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] p-8">
      <div className="max-w-5xl space-y-6">
        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5c5378]/70 mb-1">Planning</p>
            <h1 className="text-3xl font-bold tracking-tight text-[#0b1c30]">Kalender</h1>
          </div>
          <Button
            onClick={() => openCreate()}
            className="gap-2 bg-gradient-to-br from-[#2a14b4] to-[#4338ca] text-white shadow-[0px_4px_12px_rgba(42,20,180,0.25)] hover:shadow-[0px_6px_16px_rgba(42,20,180,0.35)]"
          >
            <Plus className="w-4 h-4" />
            Les inplannen
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
          {/* ── Calendar card ── */}
          <div className="bg-white rounded-2xl shadow-[0px_24px_40px_rgba(11,28,48,0.07)] overflow-hidden">
            {/* Month nav */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#eff4ff]">
              <h2 className="text-base font-bold text-[#0b1c30] capitalize">
                {format(currentMonth, "MMMM yyyy", { locale: nl })}
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5c5378] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date())}
                  className="px-3 h-8 rounded-lg text-xs font-semibold text-[#5c5378] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors"
                >
                  Vandaag
                </button>
                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5c5378] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekday labels */}
            <div className="grid grid-cols-7 bg-[#f8f9ff] border-b border-[#eff4ff]">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="py-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5c5378]/60"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7">
              {Array.from({ length: paddingDays }).map((_, i) => (
                <div key={`pad-${i}`} className="aspect-square border-b border-r border-[#eff4ff] bg-[#f8f9ff]/60" />
              ))}

              {days.map((day, i) => {
                const dayEvents = eventsForDay(day)
                const isSelected = isSameDay(day, selectedDate)
                const today = isToday(day)
                const col = (paddingDays + i) % 7
                const isWeekend = col === 5 || col === 6

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={[
                      "relative aspect-square border-b border-r border-[#eff4ff] flex flex-col items-center justify-start pt-2.5 gap-1 transition-all",
                      isSelected
                        ? "bg-gradient-to-br from-[#2a14b4] to-[#4338ca]"
                        : isWeekend
                        ? "bg-[#f8f9ff] hover:bg-[#eff4ff]"
                        : "bg-white hover:bg-[#eff4ff]",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "w-7 h-7 flex items-center justify-center text-sm font-semibold rounded-full transition-all",
                        isSelected
                          ? "text-white font-bold"
                          : today
                          ? "ring-2 ring-[#2a14b4] text-[#2a14b4] font-bold"
                          : isWeekend
                          ? "text-[#5c5378]"
                          : "text-[#0b1c30]",
                      ].join(" ")}
                    >
                      {format(day, "d")}
                    </span>

                    {dayEvents.length > 0 && (
                      <div className="flex gap-0.5 flex-wrap justify-center px-1">
                        {dayEvents.slice(0, 3).map((e) => (
                          <span
                            key={e.id}
                            className={[
                              "w-1.5 h-1.5 rounded-full",
                              isSelected ? "bg-white/60" : "bg-[#2a14b4]",
                            ].join(" ")}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Side panel ── */}
          <div className="bg-white rounded-2xl shadow-[0px_24px_40px_rgba(11,28,48,0.07)] overflow-hidden">
            {/* Selected date header */}
            <div className="px-5 py-4 border-b border-[#eff4ff]">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5c5378]/70">
                  {isToday(selectedDate)
                    ? "Vandaag"
                    : format(selectedDate, "EEEE", { locale: nl })}
                </p>
                <button
                  onClick={() => openCreate()}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[#5c5378] hover:bg-[#eff4ff] hover:text-[#2a14b4] transition-colors"
                  title="Les inplannen"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xl font-bold text-[#0b1c30] capitalize tracking-tight">
                {format(selectedDate, "d MMMM yyyy", { locale: nl })}
              </p>
              <p className="text-xs font-medium text-[#5c5378]/70 mt-0.5">
                {selectedEvents.length === 0
                  ? "Geen lessen ingepland"
                  : `${selectedEvents.length} les${selectedEvents.length > 1 ? "sen" : ""} ingepland`}
              </p>
            </div>

            {/* Events */}
            <div className="overflow-y-auto max-h-[440px]">
              <AnimatePresence mode="popLayout">
                {selectedEvents.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center justify-center py-10 px-5 gap-3 text-center"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-[#eff4ff] flex items-center justify-center">
                      <CalendarDays className="w-5 h-5 text-[#5c5378]/50" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#5c5378]">Niets gepland</p>
                      <p className="text-xs text-[#5c5378]/60 mt-0.5">
                        <button
                          onClick={() => openCreate()}
                          className="text-[#2a14b4] font-semibold hover:underline"
                        >
                          Plan een les in
                        </button>{" "}
                        voor deze dag.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  selectedEvents.map((event) => (
                    <EventCard key={event.id} event={event} fetcher={fetcher} />
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* ── Create dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Les inplannen</DialogTitle>
            <DialogDescription>
              Voeg een les toe aan je kalender.
            </DialogDescription>
          </DialogHeader>

          <fetcher.Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="create" />

            <div className="space-y-1.5">
              <Label htmlFor="name">Naam van de les</Label>
              <Input
                id="name"
                name="name"
                placeholder="bv. Wiskunde – Pythagoras"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="planned_date">Datum</Label>
              <Input
                id="planned_date"
                name="planned_date"
                type="date"
                defaultValue={newEventDate}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Toelichting</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Optionele notities, leerdoelen, benodigdheden…"
                rows={3}
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Annuleren
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Aanmaken…" : "Les inplannen"}
              </Button>
            </DialogFooter>
          </fetcher.Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Event card ─────────────────────────────────────────────────────────────

function EventCard({
  event,
  fetcher,
}: {
  event: Event
  fetcher: ReturnType<typeof useFetcher>
}) {
  const isDeleting =
    fetcher.state !== "idle" && fetcher.formData?.get("id") === event.id

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: isDeleting ? 0.4 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: -4 }}
      transition={{ duration: 0.18, ease: SOFT_EASE }}
      className="group flex items-start gap-3 px-5 py-4 border-b border-[#eff4ff] last:border-0 hover:bg-[#f8f9ff] transition-colors"
    >
      <div className="w-2 h-2 rounded-full bg-[#2a14b4] flex-shrink-0 mt-1.5" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#0b1c30] truncate">{event.name}</p>
        {event.description && (
          <p className="text-xs text-[#464554]/70 mt-0.5 line-clamp-2 leading-5">
            {event.description}
          </p>
        )}
      </div>

      <fetcher.Form method="post" className="shrink-0">
        <input type="hidden" name="intent" value="delete" />
        <input type="hidden" name="id" value={event.id} />
        <button
          type="submit"
          disabled={isDeleting}
          className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-[#5c5378]/50 hover:text-red-500 hover:bg-red-50 transition-all disabled:cursor-wait"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </fetcher.Form>
    </motion.div>
  )
}
