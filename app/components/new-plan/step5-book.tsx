import { BookOpen } from "lucide-react"
import type { Book } from "~/lib/backend/types"
import { Badge } from "~/components/ui/badge"
import { SubjectBadge } from "~/components/ui/subject-badge"
import { cn } from "~/lib/utils"
import { LEVELS, SCHOOL_YEARS, type Level, type Method, type SchoolYear } from "./types"

interface Props {
  selectedSubjectName: string
  selectedMethod: Method
  books: Book[]
  filteredBooks: Book[]
  booksLoading: boolean
  yearFilters: SchoolYear[]
  levelFilters: Level[]
  onToggleYear: (year: SchoolYear) => void
  onToggleLevel: (level: Level) => void
  onBookSelect: (book: Book) => void
}

export function Step5Book({
  selectedSubjectName,
  selectedMethod,
  books,
  filteredBooks,
  booksLoading,
  yearFilters,
  levelFilters,
  onToggleYear,
  onToggleLevel,
  onBookSelect,
}: Props) {
  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-widest">
            Stap 5 van 6
          </Badge>
          <SubjectBadge
            subjectName={selectedSubjectName}
            variant="default"
            className="text-[10px] font-semibold uppercase tracking-widest"
          />
          <Badge variant="default" className="text-[10px] font-semibold uppercase tracking-widest">
            {selectedMethod.title}
          </Badge>
        </div>
        <h1 className="text-4xl font-bold mb-1.5 text-[#0b1c30]">Kies een boek</h1>
        <p className="text-sm text-[#464554]">Selecteer het boek dat je wil gebruiken.</p>
      </div>

      {!booksLoading && books.length > 0 && (
        <div className="mb-6 space-y-3 bg-white rounded-2xl p-4 shadow-[0px_24px_40px_rgba(11,28,48,0.07)]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#464554]/60 w-12 flex-shrink-0">Jaar</span>
            {SCHOOL_YEARS.map((year) => (
              <button
                key={year}
                onClick={() => onToggleYear(year)}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-lg transition-all",
                  yearFilters.includes(year)
                    ? "bg-gradient-to-br from-[#2a14b4] to-[#4338ca] text-white shadow-[0px_4px_10px_rgba(42,20,180,0.2)]"
                    : "bg-[#eff4ff] text-[#0b1c30] hover:bg-[#dce9ff]"
                )}
              >
                {year}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#464554]/60 w-12 flex-shrink-0">Niveau</span>
            {LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => onToggleLevel(level)}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-lg transition-all",
                  levelFilters.includes(level)
                    ? "bg-gradient-to-br from-[#2a14b4] to-[#4338ca] text-white shadow-[0px_4px_10px_rgba(42,20,180,0.2)]"
                    : "bg-[#eff4ff] text-[#0b1c30] hover:bg-[#dce9ff]"
                )}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      )}

      {booksLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[#eff4ff] rounded-2xl p-4 flex gap-3 animate-pulse">
              <div className="w-10 h-14 bg-[#0b1c30]/10 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3.5 bg-[#0b1c30]/10 w-4/5 rounded" />
                <div className="h-3 bg-[#0b1c30]/10 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredBooks.length === 0 ? (
        <EmptyState message="Geen boeken gevonden voor de geselecteerde filters." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredBooks.map((book) => (
            <BookCard key={book.id ?? book.slug} book={book} onClick={() => onBookSelect(book)} />
          ))}
        </div>
      )}
    </>
  )
}

export function BookCard({
  book,
  onClick,
  subjectName,
  subjectCategory,
  compact,
}: {
  book: Book
  onClick?: () => void
  subjectName?: string | null
  subjectCategory?: string | null
  compact?: boolean
}) {
  const displaySubjectName = subjectName ?? book.subject_name ?? null
  const displaySubjectCategory = subjectCategory ?? book.subject_category ?? null

  if (compact) {
    return (
      <div className="flex items-center gap-2.5 bg-[#eff4ff] rounded-xl px-3 py-2">
        <div className="relative flex-shrink-0 w-6 h-9">
          {book.cover_url ? (
            <img src={book.cover_url} alt={book.title} className="absolute inset-0 w-full h-full object-cover rounded" />
          ) : (
            <div className="w-full h-full bg-[#dce9ff] rounded flex items-center justify-center">
              <BookOpen className="w-2.5 h-2.5 text-[#5c5378]" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold leading-tight line-clamp-1 text-[#0b1c30]">{book.title}</p>
          {(displaySubjectName || book.edition) && (
            <p className="text-[10px] text-[#464554] mt-0.5 line-clamp-1">
              {displaySubjectName ?? ""}
              {displaySubjectName && book.edition ? " · " : ""}
              {book.edition ?? ""}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "group bg-white rounded-2xl transition-all flex gap-3 p-4 overflow-visible shadow-[0px_24px_40px_rgba(11,28,48,0.07)]",
        onClick ? "cursor-pointer hover:shadow-[0px_28px_48px_rgba(11,28,48,0.12)] hover:-translate-y-0.5" : "cursor-default"
      )}
    >
      <div className="relative flex-shrink-0 w-10 h-14">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            className={cn(
              "absolute inset-0 w-full h-full object-cover rounded-lg origin-top-left transition-transform duration-200 ease-out",
              onClick && "group-hover:scale-[3.5] group-hover:z-20 group-hover:shadow-[0px_12px_24px_rgba(11,28,48,0.2)]"
            )}
          />
        ) : (
          <div className="w-full h-full bg-[#eff4ff] rounded-lg flex items-center justify-center">
            <BookOpen className="w-3.5 h-3.5 text-[#5c5378]" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <p className="font-semibold text-sm text-[#0b1c30] leading-tight line-clamp-2">{book.title}</p>
          {book.edition && (
            <p className="text-xs text-[#464554] mt-0.5">{book.edition}</p>
          )}
          {displaySubjectName && (
            <p className="text-[11px] font-medium text-[#5c5378] mt-1">
              {displaySubjectName}
              {displaySubjectCategory ? ` · ${displaySubjectCategory}` : ""}
            </p>
          )}
        </div>
        {((book.school_years ?? []).length > 0 || (book.levels ?? []).length > 0) && (
          <div className="flex flex-wrap gap-1 mt-2">
            {(book.school_years ?? []).filter((y) => y !== "Unknown").map((y) => (
              <span key={y} className="text-[9px] font-semibold px-1.5 py-0.5 bg-[#eff4ff] rounded text-[#5c5378]">
                {y}
              </span>
            ))}
            {(book.levels ?? []).filter((l) => l !== "Unknown").map((l) => (
              <span key={l} className="text-[9px] font-semibold px-1.5 py-0.5 bg-[#dce9ff] rounded text-[#2a14b4]">
                {l}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-2xl p-10 flex flex-col items-center gap-3 text-center shadow-[0px_24px_40px_rgba(11,28,48,0.07)]">
      <div className="w-10 h-10 rounded-2xl bg-[#eff4ff] flex items-center justify-center">
        <BookOpen className="w-5 h-5 text-[#5c5378]" />
      </div>
      <div>
        <p className="font-semibold text-sm text-[#0b1c30]">Niets gevonden</p>
        <p className="text-xs text-[#464554] mt-0.5">{message}</p>
      </div>
    </div>
  )
}
