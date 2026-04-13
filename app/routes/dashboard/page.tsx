"use client"

import { useState } from "react"
import { useFetcher, useLoaderData } from "react-router"
import { AnimatePresence, motion } from "framer-motion"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  Clock,
  Trash2,
  LogOut,
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
import { Badge } from "~/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog"
import type { loader } from "./route"

type Event = { id: string; name: string; description?: string | null; planned_date: string }

// ─── Helpers ───────────────────────────────────────────────────────────────

function getPaddingDays(date: Date): number {
  const day = getDay(startOfMonth(date)) // 0=Sun … 6=Sat
  return day === 0 ? 6 : day - 1 // ISO week: Ma=0
}

function toDateString(d: Date): string {
  return format(d, "yyyy-MM-dd")
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function Dashboard() {
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

  // Sluit dialoog na succesvolle aanmaak
  if (fetcher.state === "idle" && fetcher.data?.ok && dialogOpen) {
    setDialogOpen(false)
  }

  const openCreate = (day?: Date) => {
    setNewEventDate(toDateString(day ?? selectedDate))
    setDialogOpen(true)
  }

  const WEEKDAYS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"]

  return (
    <div className="min-h-screen bg-[#f5f0e8] flex flex-col">
      {/* ── Navigatie ── */}
      <header className="h-14 border-b-2 border-black bg-[#fdf4c4] flex items-center px-6 gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-7 h-7 flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-black" />
          </div>
          <span className="font-bold text-base tracking-tight">Leslab</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          asChild
        >
          <a href="/auth/logout">
            <LogOut className="w-4 h-4" />
            Uitloggen
          </a>
        </Button>
      </header>

      {/* ── Hoofdinhoud ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] w-full">
        {/* ── Kalender ── */}
        <div className="bg-[#c5d9f5] border-b-2 lg:border-b-0 border-r-0 lg:border-r-2 border-black">
          {/* Maandkoptekst */}
          <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black bg-white">
            <h2 className="text-lg font-black capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: nl })}
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setCurrentMonth(new Date())}
              >
                Vandaag
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Weekdagen */}
          <div className="grid grid-cols-7 border-b-2 border-black bg-white">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="py-2 text-center text-xs font-bold text-black/50"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Dagenraster */}
          <div className="grid grid-cols-7">
            {/* Opvulcellen vorige maand */}
            {Array.from({ length: paddingDays }).map((_, i) => (
              <div key={`pad-${i}`} className="aspect-square border-b-2 border-r-2 border-black bg-[#c5d9f5]/40" />
            ))}

            {/* Dagcellen */}
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
                    "relative aspect-square border-b-2 border-r-2 border-black flex flex-col items-center justify-start pt-2 gap-1 transition-colors cursor-pointer group",
                    isSelected
                      ? "bg-black"
                      : isWeekend
                      ? "bg-[#c5d9f5]/60 hover:bg-[#fdf4c4]"
                      : "bg-white hover:bg-[#fdf4c4]",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "w-7 h-7 flex items-center justify-center text-sm font-bold transition-colors",
                      isSelected
                        ? "text-white"
                        : today
                        ? "border-2 border-black text-black"
                        : "text-black",
                    ].join(" ")}
                  >
                    {format(day, "d")}
                  </span>

                  {/* Lespunten */}
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 flex-wrap justify-center px-1">
                      {dayEvents.slice(0, 3).map((e) => (
                        <span
                          key={e.id}
                          className={["w-1.5 h-1.5", isSelected ? "bg-white" : "bg-black"].join(" ")}
                        />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Lespaneel ── */}
        <div className="flex flex-col">
          {/* Datumkoptekst */}
          <div className="bg-[#f9d5d3] border-b-2 border-black p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold uppercase tracking-widest text-black/50">
                {isToday(selectedDate)
                  ? "Vandaag"
                  : format(selectedDate, "EEEE", { locale: nl })}
              </p>
              <Button
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => openCreate()}
              >
                <Plus className="w-3.5 h-3.5" />
                Nieuwe les
              </Button>
            </div>
            <p className="text-2xl font-black capitalize">
              {format(selectedDate, "d MMMM yyyy", { locale: nl })}
            </p>
          </div>

          {/* Lessentelling */}
          <div className="px-5 py-3 border-b-2 border-black bg-white">
            <p className="text-xs font-bold uppercase tracking-widest">
              {selectedEvents.length === 0
                ? "Geen lessen"
                : `${selectedEvents.length} les${selectedEvents.length > 1 ? "sen" : ""}`}
            </p>
          </div>

          {/* Lessenlijst */}
          <div className="flex-1 bg-[#f5f0e8] overflow-hidden">
            <div className="overflow-y-auto max-h-[calc(100vh-280px)]">
              <AnimatePresence mode="popLayout">
                {selectedEvents.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col items-center justify-center py-10 gap-3"
                  >
                    <div className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center">
                      <Clock className="w-5 h-5 text-black" />
                    </div>
                    <p className="text-sm text-black/60 text-center">
                      Geen lessen ingepland.
                      <br />
                      <button
                        onClick={() => openCreate()}
                        className="font-bold underline underline-offset-2 cursor-pointer text-black mt-0.5 inline-block"
                      >
                        Plan er een in?
                      </button>
                    </p>
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

      {/* ── Lesplan aanmaken dialoog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nieuwe les plannen</DialogTitle>
            <DialogDescription>
              Voeg een nieuw lesplan toe aan je rooster.
            </DialogDescription>
          </DialogHeader>

          <fetcher.Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="create" />

            <div className="space-y-1.5">
              <Label htmlFor="name">Naam van de les</Label>
              <Input
                id="name"
                name="name"
                placeholder="Wiskunde – Pythagoras, Geschiedenis – WO2, ..."
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
                placeholder="Optionele notities, leerdoelen, benodigdheden..."
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

// ─── Leskaart ──────────────────────────────────────────────────────────────

function EventCard({
  event,
  fetcher,
}: {
  event: Event
  fetcher: ReturnType<typeof useFetcher>
}) {
  const isDeleting =
    fetcher.state !== "idle" &&
    fetcher.formData?.get("id") === event.id

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isDeleting ? 0.4 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.15 }}
      className="group flex items-start gap-3 p-4 border-b-2 border-black bg-[#f5f0e8] hover:bg-[#fdf4c4] transition-colors"
    >
      <div className="w-2 h-2 bg-black flex-shrink-0 mt-1.5" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate">{event.name}</p>
        {event.description && (
          <p className="text-xs text-black/60 mt-0.5 line-clamp-2">
            {event.description}
          </p>
        )}
        <Badge variant="secondary" className="mt-1.5 text-[10px] px-1.5 py-0 capitalize">
          {format(new Date(event.planned_date + "T00:00:00"), "d MMM", { locale: nl })}
        </Badge>
      </div>

      <fetcher.Form method="post">
        <input type="hidden" name="intent" value="delete" />
        <input type="hidden" name="id" value={event.id} />
        <button
          type="submit"
          disabled={isDeleting}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 border border-transparent hover:border-black hover:bg-[#d63838] hover:text-white text-black/50 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </fetcher.Form>
    </motion.div>
  )
}
