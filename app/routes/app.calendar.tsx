"use client"

import { useState } from "react"
import { data, useLoaderData, Link } from "react-router"
import { AnimatePresence, motion } from "framer-motion"
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  BookOpen,
  ListChecks,
  CheckCircle2,
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

import {
  getCalendarItems,
  type CalendarItem,
  type CalendarLessonItem,
  type CalendarTodoItem,
} from "~/lib/api"
import { requireAuthContext } from "~/lib/auth.server"
import type { Route } from "./+types/app.calendar"

// ─── Loader ────────────────────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  const { token } = await requireAuthContext(request)

  // Fetch a wide range: 3 months back to 3 months forward
  const now = new Date()
  const rangeStart = format(startOfMonth(subMonths(now, 3)), "yyyy-MM-dd")
  const rangeEnd = format(endOfMonth(addMonths(now, 3)), "yyyy-MM-dd")

  const calendar = await getCalendarItems(token, rangeStart, rangeEnd)

  return data({ calendarItems: calendar.items }, { headers: { "Cache-Control": "private, max-age=10" } })
}

// ─── Meta ──────────────────────────────────────────────────────────────────

export function meta(_: Route.MetaArgs) {
  return [{ title: "Kalender — Planwijs" }]
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return {
    "Cache-Control": loaderHeaders.get("Cache-Control") ?? "",
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getPaddingDays(date: Date): number {
  const day = getDay(startOfMonth(date))
  return day === 0 ? 6 : day - 1
}

function toDateString(d: Date): string {
  return format(d, "yyyy-MM-dd")
}

function getItemDate(item: CalendarItem): string {
  return item.type === "lesson" ? item.planned_date : item.due_date
}

const SOFT_EASE = [0.22, 1, 0.36, 1] as const
const WEEKDAYS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"]

// Color constants
const LESSON_COLOR = "#2a14b4"
const LESSON_BG = "bg-[#eff4ff]"
const LESSON_TEXT = "text-[#2a14b4]"
const TODO_COLOR_PENDING = "#e67e22"
const TODO_BG_PENDING = "bg-orange-50"
const TODO_TEXT_PENDING = "text-orange-700"
const TODO_BG_DONE = "bg-emerald-50"
const TODO_TEXT_DONE = "text-emerald-700"

// ─── Component ─────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { calendarItems } = useLoaderData<typeof loader>()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const paddingDays = getPaddingDays(currentMonth)

  const itemsForDay = (day: Date) => {
    const ds = toDateString(day)
    return calendarItems.filter((item) => getItemDate(item) === ds)
  }

  const selectedItems = itemsForDay(selectedDate)
  const selectedLessons = selectedItems.filter((i): i is CalendarLessonItem => i.type === "lesson")
  const selectedTodos = selectedItems.filter((i): i is CalendarTodoItem => i.type === "preparation_todo")

  return (
    <div className="min-h-screen bg-[#f8f9ff] p-8">
      <div className="max-w-5xl space-y-6">
        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5c5378]/70 mb-1">Planning</p>
            <h1 className="text-3xl font-bold tracking-tight text-[#0b1c30]">Kalender</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-medium text-[#5c5378]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LESSON_COLOR }} />
                Les
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TODO_COLOR_PENDING }} />
                Taak
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
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
                const dayItems = itemsForDay(day)
                const hasLessons = dayItems.some((item) => item.type === "lesson")
                const hasPendingTodos = dayItems.some(
                  (item) => item.type === "preparation_todo" && item.status === "pending"
                )
                const hasDoneTodos = dayItems.some(
                  (item) => item.type === "preparation_todo" && item.status === "done"
                )
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

                    {dayItems.length > 0 && (
                      <div className="flex gap-0.5 flex-wrap justify-center px-1">
                        {hasLessons && (
                          <span
                            className={`w-2 h-2 rounded-full ${isSelected ? "bg-white/70" : ""}`}
                            style={isSelected ? undefined : { backgroundColor: LESSON_COLOR }}
                          />
                        )}
                        {hasPendingTodos && (
                          <span
                            className={`w-2 h-2 rounded-full ${isSelected ? "bg-orange-300" : ""}`}
                            style={isSelected ? undefined : { backgroundColor: TODO_COLOR_PENDING }}
                          />
                        )}
                        {hasDoneTodos && !hasPendingTodos && (
                          <span
                            className={`w-2 h-2 rounded-full ${isSelected ? "bg-emerald-300" : "bg-emerald-500"}`}
                          />
                        )}
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
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5c5378]/70 mb-1">
                {isToday(selectedDate)
                  ? "Vandaag"
                  : format(selectedDate, "EEEE", { locale: nl })}
              </p>
              <p className="text-xl font-bold text-[#0b1c30] capitalize tracking-tight">
                {format(selectedDate, "d MMMM yyyy", { locale: nl })}
              </p>
              <p className="text-xs font-medium text-[#5c5378]/70 mt-0.5">
                {selectedItems.length === 0
                  ? "Niets gepland"
                  : `${selectedLessons.length} les${selectedLessons.length !== 1 ? "sen" : ""}${selectedTodos.length > 0 ? `, ${selectedTodos.length} ta${selectedTodos.length !== 1 ? "ken" : "ak"}` : ""}`}
              </p>
            </div>

            {/* Items */}
            <div className="overflow-y-auto max-h-[440px]">
              <AnimatePresence mode="popLayout">
                {selectedItems.length === 0 ? (
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
                        Er staan geen lessen of taken op deze dag.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  selectedItems.map((item) => (
                    <CalendarItemCard key={`${item.type}-${item.id}`} item={item} />
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Calendar item card ──────────────────────────────────────────────────────

function CalendarItemCard({ item }: { item: CalendarItem }) {
  if (item.type === "lesson") {
    return <LessonCard item={item} />
  }
  return <TodoCard item={item} />
}

function LessonCard({ item }: { item: CalendarLessonItem }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: -4 }}
      transition={{ duration: 0.18, ease: SOFT_EASE }}
    >
      <Link
        to={`/lesplan/${item.lesplan_id}/les/${item.id}`}
        prefetch="intent"
        className="group flex items-start gap-3 px-5 py-4 border-b border-[#eff4ff] last:border-0 hover:bg-[#f8f9ff] transition-colors"
      >
        <div className={`w-8 h-8 rounded-lg ${LESSON_BG} flex items-center justify-center shrink-0 mt-0.5`}>
          <BookOpen className={`w-4 h-4 ${LESSON_TEXT}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${LESSON_TEXT} px-1.5 py-0.5 rounded ${LESSON_BG}`}>
              Les {item.lesson_number}
            </span>
          </div>
          <p className="text-sm font-semibold text-[#0b1c30] mt-1 group-hover:text-[#2a14b4] transition-colors truncate">
            {item.title}
          </p>
          <p className="text-xs text-[#5c5378]/70 mt-0.5 truncate">
            {item.lesplan_title}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-[#5c5378]/30 group-hover:text-[#2a14b4] shrink-0 mt-2 transition-colors" />
      </Link>
    </motion.div>
  )
}

function TodoCard({ item }: { item: CalendarTodoItem }) {
  const isDone = item.status === "done"
  const bgClass = isDone ? TODO_BG_DONE : TODO_BG_PENDING
  const textClass = isDone ? TODO_TEXT_DONE : TODO_TEXT_PENDING

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: -4 }}
      transition={{ duration: 0.18, ease: SOFT_EASE }}
    >
      <Link
        to={`/lesplan/${item.lesplan_id}/les/${item.lesson_id}`}
        prefetch="intent"
        className="group flex items-start gap-3 px-5 py-4 border-b border-[#eff4ff] last:border-0 hover:bg-[#f8f9ff] transition-colors"
      >
        <div className={`w-8 h-8 rounded-lg ${bgClass} flex items-center justify-center shrink-0 mt-0.5`}>
          {isDone ? (
            <CheckCircle2 className={`w-4 h-4 ${textClass}`} />
          ) : (
            <ListChecks className={`w-4 h-4 ${textClass}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${textClass} px-1.5 py-0.5 rounded ${bgClass}`}>
              {isDone ? "Afgerond" : "Te doen"}
            </span>
          </div>
          <p className={`text-sm font-semibold mt-1 truncate transition-colors ${isDone ? "text-[#5c5378] line-through" : "text-[#0b1c30] group-hover:text-orange-700"}`}>
            {item.title}
          </p>
          <p className="text-xs text-[#5c5378]/70 mt-0.5 truncate">
            {item.lesson_title} · {item.lesplan_title}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-[#5c5378]/30 group-hover:text-[#5c5378] shrink-0 mt-2 transition-colors" />
      </Link>
    </motion.div>
  )
}
