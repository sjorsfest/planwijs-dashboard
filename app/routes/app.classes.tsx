import { useState } from "react"
import { data, useLoaderData, useFetcher, Link } from "react-router"
import {
  Users,
  Pencil,
  Trash2,
  X,
  Check,
  Sparkles,
  Clock,
  CircleHelp,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import { getClasses, updateClass, deleteClass, type Class } from "~/lib/api"
import { requireAuthContext } from "~/lib/auth.server"
import { Button } from "~/components/ui/button"
import { Badge } from "~/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { SubjectIcon } from "~/components/ui/subject-badge"
import {
  LEVELS,
  SCHOOL_YEARS,
  getDisabledYears,
  SUPPORT_CHALLENGE_OPTIONS,
  type Level,
  type SchoolYear,
  type ClassDifficulty,
  type ClassSupportChallenge,
} from "~/components/new-plan/types"
import { cn } from "~/lib/utils"
import type { Route } from "./+types/app.classes"

export function meta() {
  return [{ title: "Klassenoverzicht — Planwijs" }]
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return {
    "Cache-Control": loaderHeaders.get("Cache-Control") ?? "",
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  const { token } = await requireAuthContext(request)
  const classes = await getClasses(token)
  return data({ classes }, { headers: { "Cache-Control": "private, max-age=10" } })
}

export async function action({ request }: Route.ActionArgs) {
  const { token } = await requireAuthContext(request)
  const formData = await request.formData()
  const intent = formData.get("_action")

  if (intent === "update") {
    const classId = formData.get("classId") as string
    const body = JSON.parse(formData.get("body") as string)
    await updateClass(classId, body, token)
    return { ok: true }
  }

  if (intent === "delete") {
    const classId = formData.get("classId") as string
    await deleteClass(classId, token)
    return { ok: true }
  }

  return { ok: false }
}

const DIFFICULTY_OPTIONS: { value: ClassDifficulty; label: string; description: string }[] = [
  { value: "Groen", label: "Groen", description: "Goed hanteerbaar" },
  { value: "Oranje", label: "Oranje", description: "Vraagt extra aandacht" },
  { value: "Rood", label: "Rood", description: "Intensieve begeleiding nodig" },
]

const SUPPORT_CHALLENGE_DESCRIPTIONS: Record<ClassSupportChallenge, string> = {
  "Meer ondersteuning": "Extra scaffolding en begeleiding",
  "Gebalanceerd": "Standaard aanpak",
  "Meer uitdaging": "Complexere taken, meer zelfstandigheid",
}

const SUPPORT_OPTIONS: { value: ClassSupportChallenge; description: string }[] = [
  ...SUPPORT_CHALLENGE_OPTIONS.map((value) => ({
    value,
    description: SUPPORT_CHALLENGE_DESCRIPTIONS[value],
  })),
]

const AI_IMPACT_ITEMS = [
  { field: "Niveau", description: "Bepaalt de taalcomplexiteit en het abstractieniveau van de les" },
  { field: "Schooljaar", description: "Jonger = meer structuur en modelling, ouder = meer zelfstandigheid" },
  { field: "Klasgrootte", description: "Beïnvloedt suggesties voor groepswerk en activiteiten" },
  { field: "Klasdynamiek", description: "Hoeveelheid scaffolding — Rood = kleine stappen, Groen = standaard" },
  { field: "Aandachtsspanne", description: "Bepaalt het lestempo en wanneer activiteitswisselingen nodig zijn" },
  { field: "Klasnotities", description: "Vrije context die de AI meeweegt bij het genereren" },
]

type FieldHintKey =
  | "level"
  | "schoolYear"
  | "size"
  | "attentionSpan"
  | "difficulty"
  | "classNotes"

interface FieldHintContent {
  impact: string
  options: string[]
}

const FIELD_HINTS: Record<FieldHintKey, FieldHintContent> = {
  level: {
    impact: "Niveau stuurt vooral taalcomplexiteit, abstractieniveau en het soort voorbeelden dat de AI kiest.",
    options: ["Vmbo-b/k/g/t", "Havo", "Vwo", "Gymnasium"],
  },
  schoolYear: {
    impact: "Schooljaar bepaalt hoeveel structuur versus zelfstandigheid de AI in werkvormen en instructie inbouwt.",
    options: ["1e t/m 6e jaar", "Hogere jaren worden beperkt op basis van gekozen niveau"],
  },
  size: {
    impact: "Klasgrootte beïnvloedt groepsindeling, tempo van klassikale momenten en haalbaarheid van differentiatie.",
    options: ["Numerieke waarde (minimaal 1 leerling)", "Hoger aantal => meer nadruk op schaalbare werkvormen"],
  },
  attentionSpan: {
    impact: "Aandachtsspanne helpt de AI bepalen hoe lang activiteiten duren en hoe vaak er gewisseld moet worden.",
    options: ["Optioneel veld", "Getal in minuten (minimaal 1)"],
  },
  difficulty: {
    impact:
      "Klasdynamiek is de primaire begeleidingsschaal: dit veld beïnvloedt hoe stapsgewijs en check-gericht de lesopbouw wordt, inclusief fallback-hints.",
    options: [
      "Groen: hanteerbaar; AI-output mag relaxter zijn, zonder sterke geforceerde vereenvoudiging of extra uitdaging.",
      "Oranje: duidelijke nudge naar meer begeleiding en extra checkmomenten.",
      "Rood: sterkste ondersteuningssignaal; fallback-hints worden expliciet stap-voor-stap en check-heavy.",
    ],
  },
  classNotes: {
    impact: "Klasnotities geven vrije context die de AI gebruikt om inhoud en werkvormen specifieker te maken.",
    options: ["Vrije tekst (optioneel)", "Bijv. gedrag, tempo, niveauverschillen of didactische aandachtspunten"],
  },
}

const SOFT_EASE = [0.22, 1, 0.36, 1] as const
const SUBTLE_EASE = [0.22, 0.64, 0.29, 0.99] as const
const SUBTLE_LAYOUT_TRANSITION = { duration: 0.5, ease: SUBTLE_EASE } as const

export default function ClassesPage() {
  const { classes } = useLoaderData<typeof loader>()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const selectedId = editingId
  const orderedClasses = selectedId
    ? [
        ...classes.filter((cls) => cls.id === selectedId),
        ...classes.filter((cls) => cls.id !== selectedId),
      ]
    : classes
  const focusedClass = editingId ? orderedClasses.find((cls) => cls.id === editingId) ?? null : null
  const classesToRender = focusedClass ? [focusedClass] : orderedClasses
  const isFocusedEditView = focusedClass !== null

  function closeEditor() {
    setEditingId(null)
  }

  function startEditor(classId: string) {
    setEditingId(classId)
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-[#0b1c30] tracking-tight">
          Klassenoverzicht
        </h1>
        <p className="text-sm text-[#464554] mt-1.5">
          Beheer je klassen en pas hun profiel aan. Deze gegevens bepalen hoe de AI je lesplannen op maat maakt.
        </p>
      </div>

      {classes.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 flex flex-col items-center gap-4 text-center shadow-[0px_24px_40px_rgba(11,28,48,0.07)]">
          <div className="w-12 h-12 rounded-2xl bg-[#eff4ff] flex items-center justify-center">
            <Users className="w-6 h-6 text-[#5c5378]" />
          </div>
          <div>
            <p className="font-semibold text-base text-[#0b1c30]">Nog geen klassen</p>
            <p className="text-sm text-[#464554] mt-1">
              Klassen worden automatisch aangemaakt wanneer je een nieuw lesplan start.
            </p>
          </div>
          <Button asChild className="gap-2 mt-2">
            <Link to="/lesplan/new" prefetch="intent">Nieuw lesplan starten</Link>
          </Button>
        </div>
      ) : (
        <LayoutGroup>
          <motion.div
            layout
            transition={{ layout: SUBTLE_LAYOUT_TRANSITION }}
            className={cn(
              "grid gap-4",
              isFocusedEditView
                ? "grid-cols-1 max-w-3xl"
                : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
            )}
          >
            {classesToRender.map((cls) => (
              <motion.div
                key={cls.id}
                layout
                transition={{ layout: SUBTLE_LAYOUT_TRANSITION }}
                className={cn(
                  isFocusedEditView && editingId === cls.id && "col-start-1 row-start-1"
                )}
              >
                <ClassCard
                  cls={cls}
                  isEditing={editingId === cls.id}
                  isDeleting={deletingId === cls.id}
                  onEdit={() => {
                    if (editingId === cls.id) {
                      closeEditor()
                    } else {
                      startEditor(cls.id!)
                    }
                  }}
                  onCancelEdit={closeEditor}
                  onDelete={() => setDeletingId(cls.id!)}
                  onCancelDelete={() => setDeletingId(null)}
                  onSaved={closeEditor}
                />
              </motion.div>
            ))}
          </motion.div>
        </LayoutGroup>
      )}
    </div>
  )
}

// ── Class Card ──────────────────────────────────────────────

interface ClassCardProps {
  cls: Class
  isEditing: boolean
  isDeleting: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
  onCancelDelete: () => void
  onSaved: () => void
}

function ClassCard({
  cls,
  isEditing,
  isDeleting,
  onEdit,
  onCancelEdit,
  onDelete,
  onCancelDelete,
  onSaved,
}: ClassCardProps) {
  const fetcher = useFetcher()
  const isSubmitting = fetcher.state !== "idle"

  function handleDelete() {
    const formData = new FormData()
    formData.set("_action", "delete")
    formData.set("classId", cls.id!)
    fetcher.submit(formData, { method: "POST" })
    onCancelDelete()
  }

  return (
    <motion.div
      layout
      transition={{ layout: SUBTLE_LAYOUT_TRANSITION }}
      className="bg-white rounded-2xl shadow-[0px_24px_40px_rgba(11,28,48,0.07)] overflow-hidden"
    >
      {/* ── View mode ── */}
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2a14b4] to-[#4338ca] flex items-center justify-center flex-shrink-0 shadow-[0px_4px_10px_rgba(42,20,180,0.25)]">
              <SubjectIcon subjectName={cls.subject} className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#0b1c30] truncate">{cls.subject}</p>
              <p className="text-xs text-[#464554]">{cls.level} · {cls.school_year}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onEdit}
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                isEditing
                  ? "bg-[#2a14b4]/10 text-[#2a14b4]"
                  : "text-[#5c5378] hover:bg-[#eff4ff]"
              )}
            >
              {isEditing ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
            </button>
            <button
              onClick={isDeleting ? handleDelete : onDelete}
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                isDeleting
                  ? "bg-red-50 text-red-600"
                  : "text-[#5c5378] hover:bg-[#eff4ff]"
              )}
            >
              {isDeleting ? <Check className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
            </button>
            {isDeleting && (
              <button
                onClick={onCancelDelete}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5c5378] hover:bg-[#eff4ff] transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {isDeleting && (
          <p className="text-xs text-red-600 font-medium mb-3">
            Klik op ✓ om deze klas te verwijderen
          </p>
        )}

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="inline-flex items-center gap-1.5 bg-[#eff4ff] rounded-lg px-2.5 py-1.5">
            <Users className="w-3.5 h-3.5 text-[#5c5378]" />
            <span className="text-xs font-semibold text-[#0b1c30]">{cls.size} leerlingen</span>
          </div>
          <DifficultyPill difficulty={cls.difficulty ?? null} />
        </div>

        {/* Optional fields */}
        <div className="space-y-1.5">
          {cls.attention_span_minutes != null && (
            <div className="flex items-center gap-1.5 text-xs text-[#464554]">
              <Clock className="w-3.5 h-3.5 text-[#5c5378]" />
              <span>{cls.attention_span_minutes} min aandachtsspanne</span>
            </div>
          )}
          {cls.support_challenge != null && (
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px] font-semibold">
                {cls.support_challenge}
              </Badge>
            </div>
          )}
          {cls.class_notes && (
            <p className="text-xs text-[#464554] line-clamp-2 mt-1">{cls.class_notes}</p>
          )}
        </div>
      </div>

      {/* ── Edit mode ── */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.5, ease: SUBTLE_EASE },
              opacity: { duration: 0.28, ease: SOFT_EASE },
            }}
            className="overflow-hidden"
          >
            <div className="border-t border-[#eff4ff]">
              <EditForm cls={cls} onSaved={onSaved} onCancel={onCancelEdit} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Difficulty Pill ─────────────────────────────────────────

function DifficultyPill({ difficulty }: { difficulty: ClassDifficulty | null }) {
  return (
    <div className="inline-flex items-center gap-1.5 bg-white border border-[#e6e8f3] rounded-lg px-2.5 py-1.5">
      <span
        className={cn(
          "w-2 h-2 rounded-full",
          difficulty === "Groen"
            ? "bg-emerald-500"
            : difficulty === "Oranje"
            ? "bg-orange-400"
            : difficulty === "Rood"
            ? "bg-red-500"
            : "bg-[#a6abc0]"
        )}
      />
      <span className="text-xs font-semibold text-[#464554]">
        {difficulty ?? "Niet opgegeven"}
      </span>
    </div>
  )
}

interface FieldHintLabelProps {
  label: string
  hint: FieldHintContent
}

function FieldHintLabel({ label, hint }: FieldHintLabelProps) {
  return (
    <div className="mb-1.5">
      <div className="relative inline-flex items-center gap-1.5 group/field-hint">
        <span className="block text-xs font-medium text-[#464554]">{label}</span>
        <span
          tabIndex={0}
          aria-label={`Uitleg over ${label}`}
          className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#eff4ff] text-[#5c5378] transition-colors group-hover/field-hint:bg-[#dce9ff] group-focus-within/field-hint:bg-[#dce9ff]"
        >
          <CircleHelp className="w-3 h-3" />
        </span>

        <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-72 max-w-[calc(100vw-4rem)] rounded-xl border border-[#dbe4f8] bg-white/95 p-3 opacity-0 shadow-[0px_20px_32px_rgba(11,28,48,0.18)] translate-y-1 transition-all duration-200 group-hover/field-hint:opacity-100 group-hover/field-hint:translate-y-0 group-focus-within/field-hint:opacity-100 group-focus-within/field-hint:translate-y-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#5c5378]">
            AI-impact
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-[#464554]">
            {hint.impact}
          </p>
          <div className="mt-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#5c5378]">
              Mogelijke waarden
            </p>
            <ul className="mt-1 space-y-1">
              {hint.options.map((option) => (
                <li key={option} className="text-[11px] leading-relaxed text-[#464554]">
                  • {option}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Edit Form ───────────────────────────────────────────────

interface EditFormProps {
  cls: Class
  onSaved: () => void
  onCancel: () => void
}

function EditForm({ cls, onSaved, onCancel }: EditFormProps) {
  const fetcher = useFetcher()
  const isSubmitting = fetcher.state !== "idle"

  const [level, setLevel] = useState<Level>(cls.level)
  const [schoolYear, setSchoolYear] = useState<SchoolYear>(cls.school_year)
  const [size, setSize] = useState<number>(cls.size)
  const [difficulty, setDifficulty] = useState<ClassDifficulty | null>(cls.difficulty ?? null)
  const [attentionSpan, setAttentionSpan] = useState<number | null>(cls.attention_span_minutes ?? null)
  const [supportChallenge, setSupportChallenge] = useState<ClassSupportChallenge | null>(cls.support_challenge ?? null)
  const [classNotes, setClassNotes] = useState<string>(cls.class_notes ?? "")
  const [showAiInfo, setShowAiInfo] = useState(false)

  const disabledYears = getDisabledYears(level)

  function handleSave() {
    const body: Record<string, unknown> = {
      level,
      school_year: schoolYear,
      size,
      difficulty: difficulty || null,
      attention_span_minutes: attentionSpan || null,
      support_challenge: supportChallenge || null,
      class_notes: classNotes.trim() || null,
    }

    const formData = new FormData()
    formData.set("_action", "update")
    formData.set("classId", cls.id!)
    formData.set("body", JSON.stringify(body))
    fetcher.submit(formData, { method: "POST" })
    onSaved()
  }

  return (
    <div className="p-5 space-y-4">
      {/* Level & Year */}
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <FieldHintLabel
            label="Niveau"
            hint={FIELD_HINTS.level}
          />
          <Select value={level} onValueChange={(v) => setLevel(v as Level)}>
            <SelectTrigger className="h-10 rounded-xl border border-transparent bg-[#dce9ff] px-3 text-sm font-medium text-[#0b1c30] focus:ring-2 focus:ring-[#2a14b4]/35 focus:ring-offset-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              className="rounded-xl border border-[#c7d6f5] bg-[#f8fbff] p-1 text-[#0b1c30] shadow-[0px_20px_32px_rgba(11,28,48,0.18)]"
              position="popper"
            >
              {LEVELS.map((l) => (
                <SelectItem
                  key={l}
                  value={l}
                  className="rounded-lg py-2 pl-8 pr-3 text-sm font-medium text-[#0b1c30] focus:bg-[#dce9ff] focus:text-[#0b1c30]"
                >
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="block">
          <FieldHintLabel
            label="Schooljaar"
            hint={FIELD_HINTS.schoolYear}
          />
          <Select value={schoolYear} onValueChange={(v) => setSchoolYear(v as SchoolYear)}>
            <SelectTrigger className="h-10 rounded-xl border border-transparent bg-[#dce9ff] px-3 text-sm font-medium text-[#0b1c30] focus:ring-2 focus:ring-[#2a14b4]/35 focus:ring-offset-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              className="rounded-xl border border-[#c7d6f5] bg-[#f8fbff] p-1 text-[#0b1c30] shadow-[0px_20px_32px_rgba(11,28,48,0.18)]"
              position="popper"
            >
              {SCHOOL_YEARS.map((y) => (
                <SelectItem
                  key={y}
                  value={y}
                  disabled={disabledYears.includes(y)}
                  className="rounded-lg py-2 pl-8 pr-3 text-sm font-medium text-[#0b1c30] focus:bg-[#dce9ff] focus:text-[#0b1c30] data-[disabled]:text-[#8a91a5]"
                >
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      {/* Class size & Attention span */}
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <FieldHintLabel
            label="Aantal leerlingen"
            hint={FIELD_HINTS.size}
          />
          <input
            type="number"
            min={1}
            max={99}
            value={size}
            onChange={(e) => setSize(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-full h-10 rounded-xl bg-[#dce9ff] px-3 text-sm font-semibold text-[#0b1c30] outline-none focus:ring-2 focus:ring-[#2a14b4]/35"
          />
        </label>

        <label className="block">
          <FieldHintLabel
            label="Aandachtsspanne (min)"
            hint={FIELD_HINTS.attentionSpan}
          />
          <input
            type="number"
            min={1}
            max={120}
            value={attentionSpan ?? ""}
            onChange={(e) =>
              setAttentionSpan(e.target.value === "" ? null : Math.max(1, parseInt(e.target.value, 10) || 1))
            }
            placeholder="bijv. 15"
            className="w-full h-10 rounded-xl bg-[#dce9ff] px-3 text-sm font-semibold text-[#0b1c30] outline-none focus:ring-2 focus:ring-[#2a14b4]/35 placeholder:font-normal placeholder:text-[#8a91a5]"
          />
        </label>
      </div>

      {/* Difficulty */}
      <div>
        <FieldHintLabel
          label="Klasdynamiek"
          hint={FIELD_HINTS.difficulty}
        />
        <div className="grid grid-cols-3 gap-2">
          {DIFFICULTY_OPTIONS.map(({ value, description }) => (
            <button
              key={value}
              onClick={() => setDifficulty(value)}
              className={cn(
                "rounded-xl px-3 py-2.5 text-left transition-all border",
                difficulty === value
                  ? value === "Groen"
                    ? "border-emerald-500 bg-emerald-50 shadow-[0px_6px_16px_rgba(16,185,129,0.2)]"
                    : value === "Oranje"
                    ? "border-orange-400 bg-[#fff1d8] shadow-[0px_6px_16px_rgba(251,146,60,0.2)]"
                    : "border-red-500 bg-red-50 shadow-[0px_6px_16px_rgba(239,68,68,0.2)]"
                  : "border-[#e6e8f3] bg-[#f8f9ff] hover:bg-[#eff4ff]"
              )}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "w-2 h-2 rounded-full",
                    value === "Groen" ? "bg-emerald-500" : value === "Oranje" ? "bg-orange-400" : "bg-red-500"
                  )}
                />
                <span className="text-xs font-semibold text-[#0b1c30]">{value}</span>
              </span>
              <p className="text-[11px] text-[#464554] mt-0.5">{description}</p>
            </button>
          ))}
        </div>
      </div>
      {/* Class notes */}
      <label className="block">
        <FieldHintLabel
          label="Klasnotities"
          hint={FIELD_HINTS.classNotes}
        />
        <textarea
          rows={3}
          value={classNotes}
          onChange={(e) => setClassNotes(e.target.value)}
          placeholder="Bijv. de klas is energiek maar gemotiveerd, veel verschil in niveau..."
          className="w-full rounded-xl bg-[#dce9ff] px-3 py-2.5 text-sm text-[#0b1c30] outline-none focus:ring-2 focus:ring-[#2a14b4]/35 placeholder:text-[#8a91a5] resize-none"
        />
      </label>

      {/* AI Impact Explainer */}
      <div>
        <button
          onClick={() => setShowAiInfo(!showAiInfo)}
          className="flex items-center gap-2 text-xs font-medium text-[#2a14b4] hover:text-[#4338ca] transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Hoe beïnvloedt dit je lessen?</span>
          {showAiInfo ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        <AnimatePresence>
          {showAiInfo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: SOFT_EASE }}
              className="overflow-hidden"
            >
              <div className="mt-2 bg-[#eff4ff] rounded-xl p-4 space-y-2.5">
                {AI_IMPACT_ITEMS.map(({ field, description }) => (
                  <div key={field}>
                    <span className="text-xs font-semibold text-[#0b1c30]">{field}</span>
                    <p className="text-[11px] text-[#464554] leading-relaxed">{description}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          onClick={handleSave}
          disabled={isSubmitting}
          className="gap-1.5 text-sm"
        >
          <Check className="w-4 h-4" />
          Opslaan
        </Button>
        <Button
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
          className="text-sm"
        >
          Annuleren
        </Button>
      </div>
    </div>
  )
}
