import { BookOpen } from "lucide-react"
import type { Book } from "~/lib/api"
import { Badge } from "~/components/ui/badge"
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
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest">
            Stap 5 van 6
          </Badge>
          <Badge className="text-[10px] font-black uppercase tracking-widest bg-black text-white">
            {selectedSubjectName}
          </Badge>
          <Badge className="text-[10px] font-black uppercase tracking-widest bg-black text-white">
            {selectedMethod.title}
          </Badge>
        </div>
        <h1 className="text-4xl font-black mb-1">Kies een boek</h1>
        <p className="text-sm text-black/60 font-medium">Selecteer het boek dat je wil gebruiken.</p>
      </div>

      {!booksLoading && books.length > 0 && (
        <div className="mb-6 space-y-3 border-2 border-black bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-black/50 w-12 flex-shrink-0">Jaar</span>
            {SCHOOL_YEARS.map((year) => (
              <button
                key={year}
                onClick={() => onToggleYear(year)}
                className={cn(
                  "px-3 py-1 text-xs font-bold border-2 border-black transition-colors",
                  yearFilters.includes(year) ? "bg-black text-white" : "bg-white hover:bg-[#fdf4c4]"
                )}
              >
                {year}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-black/50 w-12 flex-shrink-0">Niveau</span>
            {LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => onToggleLevel(level)}
                className={cn(
                  "px-3 py-1 text-xs font-bold border-2 border-black transition-colors",
                  levelFilters.includes(level) ? "bg-black text-white" : "bg-white hover:bg-[#fdf4c4]"
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
            <div key={i} className="border-2 border-black bg-white p-4 flex gap-3 animate-pulse">
              <div className="w-10 h-14 bg-black/10 flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3.5 bg-black/10 w-4/5" />
                <div className="h-3 bg-black/10 w-1/2" />
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
      <div className="flex items-center gap-2.5 border border-black/20 bg-black/[0.03] px-3 py-2">
        <div className="relative flex-shrink-0 w-6 h-9">
          {book.cover_url ? (
            <img src={book.cover_url} alt={book.title} className="absolute inset-0 w-full h-full object-cover border border-black/20" />
          ) : (
            <div className="w-full h-full bg-[#f5f0e8] border border-black/20 flex items-center justify-center">
              <BookOpen className="w-2.5 h-2.5 text-black/30" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold leading-tight line-clamp-1 text-black/80">{book.title}</p>
          {(displaySubjectName || book.edition) && (
            <p className="text-[10px] text-black/40 mt-0.5 line-clamp-1">
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
        "group border-2 border-black bg-white transition-colors flex gap-3 p-4 overflow-visible",
        onClick ? "cursor-pointer hover:bg-[#fdf4c4]" : "cursor-default"
      )}
    >
      <div className="relative flex-shrink-0 w-10 h-14">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            className={cn(
              "absolute inset-0 w-full h-full object-cover border border-black origin-top-left transition-transform duration-200 ease-out",
              onClick && "group-hover:scale-[3.5] group-hover:z-20 group-hover:shadow-[3px_3px_0px_#000]"
            )}
          />
        ) : (
          <div className="w-full h-full bg-[#f5f0e8] border border-black flex items-center justify-center">
            <BookOpen className="w-3.5 h-3.5 text-black/30" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <p className="font-black text-sm leading-tight line-clamp-2">{book.title}</p>
          {book.edition && (
            <p className="text-xs text-black/50 mt-0.5">{book.edition}</p>
          )}
          {displaySubjectName && (
            <p className="text-[11px] font-bold text-black/65 mt-1">
              {displaySubjectName}
              {displaySubjectCategory ? ` · ${displaySubjectCategory}` : ""}
            </p>
          )}
        </div>
        {((book.school_years ?? []).length > 0 || (book.levels ?? []).length > 0) && (
          <div className="flex flex-wrap gap-1 mt-2">
            {(book.school_years ?? []).filter((y) => y !== "Unknown").map((y) => (
              <span key={y} className="text-[9px] font-bold px-1.5 py-0.5 border border-black/30 text-black/50">
                {y}
              </span>
            ))}
            {(book.levels ?? []).filter((l) => l !== "Unknown").map((l) => (
              <span key={l} className="text-[9px] font-bold px-1.5 py-0.5 bg-black/5 border border-black/20 text-black/60">
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
    <div className="border-2 border-black border-dashed bg-white p-10 flex flex-col items-center gap-3 text-center">
      <div className="w-10 h-10 border-2 border-black bg-[#f5f0e8] flex items-center justify-center">
        <BookOpen className="w-5 h-5" />
      </div>
      <div>
        <p className="font-black text-sm">Niets gevonden</p>
        <p className="text-xs text-black/60 mt-0.5">{message}</p>
      </div>
    </div>
  )
}
