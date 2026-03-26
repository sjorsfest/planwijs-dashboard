import { motion, type Variants } from "framer-motion"
import { ArrowLeft, ArrowRight, BookOpen, LoaderCircle } from "lucide-react"
import type { Book, BookDetail, Subject } from "~/lib/api"
import type { ClassDifficulty, Level, Method, SchoolYear } from "./types"
import { cn } from "~/lib/utils"

interface Props {
  selectedLevel: Level
  selectedYear: SchoolYear
  selectedSubject: Subject
  lessonCount: number
  lessonDuration: number
  classSize: number
  classDifficulty: ClassDifficulty
  selectedMethod: Method
  selectedBook: Book
  bookDetail: BookDetail | null
  selectedParagraphIds: string[]
  onBack: () => void
  onConfirm: () => void
  submitting?: boolean
  submitError?: string | null
  submitLabel?: string
}

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.25 } },
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
}

const DIFFICULTY_STYLES: Record<string, { bg: string; dot: string; text: string }> = {
  Groen: { bg: "bg-emerald-50", dot: "bg-emerald-500", text: "text-emerald-700" },
  Oranje: { bg: "bg-orange-50", dot: "bg-orange-400", text: "text-orange-700" },
  Rood: { bg: "bg-red-50", dot: "bg-red-400", text: "text-red-700" },
}

export function PlanSummary({
  selectedLevel,
  selectedYear,
  selectedSubject,
  lessonCount,
  lessonDuration,
  classSize,
  classDifficulty,
  selectedMethod,
  selectedBook,
  bookDetail,
  selectedParagraphIds,
  onBack,
  onConfirm,
  submitting = false,
  submitError = null,
  submitLabel = "Maak lesplan",
}: Props) {
  const chapterBreakdown = (bookDetail?.chapters ?? [])
    .map((chapter) => ({
      chapter,
      selected: chapter.paragraphs.filter((paragraph) => selectedParagraphIds.includes(paragraph.id)),
    }))
    .filter((item) => item.selected.length > 0)

  const diff = DIFFICULTY_STYLES[classDifficulty as string] ?? {
    bg: "bg-black/5",
    dot: "bg-black/30",
    text: "text-black/70",
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-lg w-full"
    >
      <motion.div
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="mb-6"
      >
        <p className="text-[10px] font-black uppercase tracking-widest text-black/35 mb-0.5">Overzicht</p>
        <h1 className="text-3xl font-black">Controleer je lesplan</h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="border-2 border-black bg-white mb-3 flex gap-4 p-4 items-center"
      >
        <motion.div
          initial={{ scale: 0.82, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.38, delay: 0.16, ease: [0.34, 1.4, 0.64, 1] }}
          className="relative flex-shrink-0 w-11 h-15"
        >
          {selectedBook.cover_url ? (
            <img
              src={selectedBook.cover_url}
              alt={selectedBook.title}
              className="w-11 h-15 object-cover border-2 border-black shadow-[2px_2px_0px_#000]"
              style={{ height: "60px" }}
            />
          ) : (
            <div className="w-11 bg-[#f5f0e8] border-2 border-black flex items-center justify-center" style={{ height: "60px" }}>
              <BookOpen className="w-4 h-4 text-black/30" />
            </div>
          )}
        </motion.div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-base leading-snug">{selectedBook.title}</p>
          <p className="text-xs text-black/50 mt-0.5">
            {selectedSubject.name}
            {selectedBook.edition ? ` · ${selectedBook.edition}` : ""}
          </p>
        </div>
      </motion.div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-3 mb-3"
      >
        <StatBlock label="Klas" variants={fadeUp}>
          <p className="text-lg font-black leading-tight">{selectedLevel}</p>
          <p className="text-xs text-black/50 mt-0.5">{selectedYear} · {classSize} leerlingen</p>
        </StatBlock>

        <StatBlock label="Lessen" variants={fadeUp}>
          <p className="text-lg font-black leading-tight">{lessonCount}×</p>
          <p className="text-xs text-black/50 mt-0.5">{lessonDuration} min per les</p>
        </StatBlock>

        <StatBlock label="Methode" variants={fadeUp}>
          <p className="text-sm font-bold leading-snug line-clamp-2">{selectedMethod.title}</p>
        </StatBlock>

        <StatBlock label="Leerniveau" variants={fadeUp}>
          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold", diff.bg, diff.text)}>
            <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", diff.dot)} />
            {classDifficulty}
          </span>
        </StatBlock>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.45 }}
        className="border-2 border-black bg-white"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-black">
          <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Paragrafen</p>
          <span className="text-[11px] font-black bg-black text-white px-2 py-0.5">
            {selectedParagraphIds.length} geselecteerd
          </span>
        </div>

        <div className="divide-y divide-black/8">
          {chapterBreakdown.map(({ chapter, selected }, index) => (
            <motion.div
              key={chapter.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.48 + index * 0.05 }}
              className="px-4 py-3 flex items-start justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-black/80">
                  {chapter.index}. {chapter.title}
                </p>
                <p className="text-[10px] text-black/40 mt-1 leading-relaxed">
                  {selected.map((paragraph) => `${chapter.index}.${paragraph.index} ${paragraph.title}`).join("  ·  ")}
                </p>
              </div>
              <span className="text-[10px] font-black text-black/25 flex-shrink-0 tabular-nums pt-0.5">
                {selected.length}×
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.28 }}
        className="mt-5"
      >
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-black/60 hover:text-black border-2 border-black/20 hover:border-black bg-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Terug
          </button>

          <button
            onClick={onConfirm}
            disabled={submitting}
            className="relative flex items-center gap-2.5 bg-black text-white px-5 py-2.5 font-black text-sm hover:bg-black/85 transition-colors overflow-hidden disabled:opacity-70"
          >
            {submitting ? (
              <>
                <LoaderCircle className="w-4 h-4 animate-spin" />
                Lesplan genereren...
              </>
            ) : (
              <>
                {submitLabel}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {submitError ? (
          <p className="mt-3 text-sm font-bold text-[#d63838]">
            {submitError}
          </p>
        ) : null}
      </motion.div>
    </motion.div>
  )
}

function StatBlock({
  label,
  children,
  variants,
}: {
  label: string
  children: React.ReactNode
  variants: Variants
}) {
  return (
    <motion.div variants={variants} className="border-2 border-black bg-white px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-black/30 mb-1.5">{label}</p>
      {children}
    </motion.div>
  )
}
