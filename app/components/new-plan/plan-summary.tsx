import { motion, type Variants } from "framer-motion"
import { ArrowLeft, ArrowRight, BookOpen, LoaderCircle } from "lucide-react"
import type { Book, BookDetail, Subject } from "~/lib/backend/types"
import { SubjectBadge } from "~/components/ui/subject-badge"
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
  Oranje: { bg: "bg-[#ffdf9f]/50", dot: "bg-[#f9bd22]", text: "text-[#4c3700]" },
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
    bg: "bg-[#eff4ff]",
    dot: "bg-[#5c5378]",
    text: "text-[#0b1c30]",
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-xl w-full"
    >
      <motion.div
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="mb-7"
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#464554]/50 mb-1">Overzicht</p>
        <h1 className="text-4xl font-bold text-[#0b1c30]">Controleer je lesplan</h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="bg-white rounded-2xl mb-4 flex gap-4 p-5 items-center shadow-[0px_24px_40px_rgba(11,28,48,0.07)]"
      >
        <motion.div
          initial={{ scale: 0.82, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.38, delay: 0.16, ease: [0.34, 1.4, 0.64, 1] }}
          className="relative flex-shrink-0 w-12"
          style={{ height: "66px" }}
        >
          {selectedBook.cover_url ? (
            <img
              src={selectedBook.cover_url}
              alt={selectedBook.title}
              className="w-12 object-cover rounded-lg shadow-[0px_8px_20px_rgba(11,28,48,0.15)]"
              style={{ height: "66px" }}
            />
          ) : (
            <div className="w-12 bg-[#eff4ff] rounded-lg flex items-center justify-center" style={{ height: "66px" }}>
              <BookOpen className="w-5 h-5 text-[#5c5378]" />
            </div>
          )}
        </motion.div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-lg text-[#0b1c30] leading-snug">{selectedBook.title}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <SubjectBadge subjectName={selectedSubject.name} variant="outline" className="text-[11px] py-1" />
            {selectedBook.edition ? <span className="text-sm text-[#464554]">{selectedBook.edition}</span> : null}
          </div>
        </div>
      </motion.div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-3.5 mb-4"
      >
        <StatBlock label="Klas" variants={fadeUp}>
          <p className="text-xl font-bold text-[#0b1c30] leading-tight">{selectedLevel}</p>
          <p className="text-sm text-[#464554] mt-1">{selectedYear} · {classSize} leerlingen</p>
        </StatBlock>

        <StatBlock label="Lessen" variants={fadeUp}>
          <p className="text-xl font-bold text-[#0b1c30] leading-tight">{lessonCount}×</p>
          <p className="text-sm text-[#464554] mt-1">{lessonDuration} min per les</p>
        </StatBlock>

        <StatBlock label="Methode" variants={fadeUp}>
          <p className="text-base font-semibold text-[#0b1c30] leading-snug line-clamp-2">{selectedMethod.title}</p>
        </StatBlock>

        <StatBlock label="Leerniveau" variants={fadeUp}>
          <span className={cn("inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-full", diff.bg, diff.text)}>
            <span className={cn("w-2 h-2 rounded-full flex-shrink-0", diff.dot)} />
            {classDifficulty}
          </span>
        </StatBlock>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.45 }}
        className="bg-white rounded-2xl shadow-[0px_24px_40px_rgba(11,28,48,0.07)] overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#eff4ff]">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#464554]/60">Paragrafen</p>
          <span className="text-xs font-semibold bg-[#2a14b4]/10 text-[#2a14b4] px-3 py-1 rounded-full">
            {selectedParagraphIds.length} geselecteerd
          </span>
        </div>

        <div className="divide-y divide-[#eff4ff]">
          {chapterBreakdown.map(({ chapter, selected }, index) => (
            <motion.div
              key={chapter.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.48 + index * 0.05 }}
              className="px-5 py-3.5 flex items-start justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#0b1c30]">
                  {chapter.index}. {chapter.title}
                </p>
                <p className="text-xs text-[#464554]/60 mt-1.5 leading-relaxed">
                  {selected.map((paragraph) => `${chapter.index}.${paragraph.index} ${paragraph.title}`).join("  ·  ")}
                </p>
              </div>
              <span className="text-xs font-semibold text-[#464554]/40 flex-shrink-0 tabular-nums pt-0.5">
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
        className="mt-6"
      >
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-3 text-base font-semibold text-[#464554] hover:text-[#0b1c30] bg-[#eff4ff] hover:bg-[#dce9ff] rounded-xl transition-colors disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Terug
          </button>

          <button
            onClick={onConfirm}
            disabled={submitting}
            className="relative flex items-center gap-2.5 bg-gradient-to-br from-[#2a14b4] to-[#4338ca] text-white px-6 py-3 font-semibold text-base rounded-xl hover:brightness-110 transition-all shadow-[0px_4px_16px_rgba(42,20,180,0.3)] disabled:opacity-70 disabled:shadow-none"
          >
            {submitting ? (
              <>
                <LoaderCircle className="w-5 h-5 animate-spin" />
                Lesplan genereren...
              </>
            ) : (
              <>
                {submitLabel}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

        {submitError ? (
          <p className="mt-3 text-base font-semibold text-[#ba1a1a]">
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
    <motion.div variants={variants} className="bg-white rounded-2xl px-5 py-4 shadow-[0px_24px_40px_rgba(11,28,48,0.07)]">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#464554]/50 mb-2">{label}</p>
      {children}
    </motion.div>
  )
}
