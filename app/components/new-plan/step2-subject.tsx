import { ArrowRight, BookOpen } from "lucide-react"
import type { Book, Subject } from "~/lib/api"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { SubjectIcon } from "~/components/ui/subject-badge"
import { cn } from "~/lib/utils"
import type { Level, Method, SchoolYear } from "./types"

interface Props {
  selectedLevel: Level
  selectedYear: SchoolYear
  selectedCategory: string | null
  selectedSubject: Subject | null
  selectedMethod: Method | null
  selectedBook: Book | null
  subjects: Subject[]
  subjectsLoading: boolean
  methods: Method[]
  methodsLoading: boolean
  filteredBooks: Book[]
  booksLoading: boolean
  onCategorySelect: (category: string) => void
  onSubjectSelect: (subject: Subject) => void
  onMethodSelect: (method: Method) => void
  onBookSelect: (book: Book) => void
  onConfirm: () => void
  canContinue: boolean
}

function getBookKey(book: Book) {
  return book.id ?? book.slug
}

export function Step2Subject({
  selectedLevel,
  selectedYear,
  selectedCategory,
  selectedSubject,
  selectedMethod,
  selectedBook,
  subjects,
  subjectsLoading,
  methods,
  methodsLoading,
  filteredBooks,
  booksLoading,
  onCategorySelect,
  onSubjectSelect,
  onMethodSelect,
  onBookSelect,
  onConfirm,
  canContinue,
}: Props) {
  const categoryMap = subjects.reduce<Record<string, Subject[]>>((acc, subject) => {
    const category = subject.category?.trim() || "Overig"
    ;(acc[category] ??= []).push(subject)
    return acc
  }, {})

  const categories = Object.keys(categoryMap).sort((a, b) => a.localeCompare(b, "nl"))
  const visibleSubjects = selectedCategory ? (categoryMap[selectedCategory] ?? []) : []
  const selectedBookKey = selectedBook ? getBookKey(selectedBook) : null

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-widest">
            Stap 2 van 3
          </Badge>
          <Badge variant="default" className="text-[10px] font-semibold uppercase tracking-widest">
            {selectedLevel}
          </Badge>
          <Badge variant="default" className="text-[10px] font-semibold uppercase tracking-widest">
            {selectedYear}
          </Badge>
        </div>
        <h1 className="text-4xl font-bold mb-1.5 text-[#0b1c30]">Vak, methode en boek</h1>
        <p className="text-sm text-[#464554]">Kies eerst een categorie, daarna een vak, methode en passend boek.</p>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-[0px_24px_40px_rgba(11,28,48,0.07)]">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#464554] mb-3">1. Categorie</p>
          {subjectsLoading ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-8 w-24 rounded-lg bg-[#eff4ff] animate-pulse" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <EmptyState message="Geen categorieen gevonden." />
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => onCategorySelect(category)}
                  className={cn(
                    "px-3 py-2 text-sm font-semibold rounded-lg transition-all",
                    selectedCategory === category
                      ? "bg-gradient-to-br from-[#2a14b4] to-[#4338ca] text-white shadow-[0px_4px_12px_rgba(42,20,180,0.25)]"
                      : "bg-[#eff4ff] text-[#0b1c30] hover:bg-[#dce9ff]"
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-[0px_24px_40px_rgba(11,28,48,0.07)]">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#464554] mb-3">2. Vak</p>
          {!selectedCategory ? (
            <p className="text-sm text-[#464554]">Kies eerst een categorie om vakken te zien.</p>
          ) : subjectsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 rounded-xl bg-[#eff4ff] animate-pulse" />
              ))}
            </div>
          ) : visibleSubjects.length === 0 ? (
            <EmptyState message="Geen vakken gevonden in deze categorie." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {visibleSubjects
                .sort((a, b) => a.name.localeCompare(b.name, "nl"))
                .map((subject) => {
                  const selected = selectedSubject?.id === subject.id

                  return (
                    <button
                      key={subject.id}
                      onClick={() => onSubjectSelect(subject)}
                      className={cn(
                        "rounded-xl px-4 py-3 text-left transition-all border",
                        selected
                          ? "border-[#2a14b4] bg-[#eff4ff] shadow-[0px_8px_24px_rgba(42,20,180,0.16)]"
                          : "border-[#e6e8f3] bg-[#f8f9ff] hover:bg-[#eff4ff]"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "w-7 h-7 rounded-lg inline-flex items-center justify-center",
                            selected ? "bg-[#2a14b4]/10 text-[#2a14b4]" : "bg-[#dce9ff] text-[#5c5378]"
                          )}
                        >
                          <SubjectIcon subjectName={subject.name} className="w-4 h-4" />
                        </span>
                        <p className="text-sm font-semibold text-[#0b1c30] leading-tight">{subject.name}</p>
                      </div>
                    </button>
                  )
                })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-[0px_24px_40px_rgba(11,28,48,0.07)]">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#464554] mb-3">3. Methode</p>
          {!selectedSubject ? (
            <p className="text-sm text-[#464554]">Kies eerst een vak om methodes te laden.</p>
          ) : methodsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 rounded-xl bg-[#eff4ff] animate-pulse" />
              ))}
            </div>
          ) : methods.length === 0 ? (
            <EmptyState message={`Geen methodes gevonden voor ${selectedSubject.name}.`} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {methods.map((method) => {
                const key = method.id ?? method.slug
                const selected = selectedMethod && (selectedMethod.id ?? selectedMethod.slug) === key
                return (
                  <button
                    key={key}
                    onClick={() => onMethodSelect(method)}
                    className={cn(
                      "rounded-xl px-4 py-3 text-left transition-all border",
                      selected
                        ? "border-[#2a14b4] bg-[#eff4ff] shadow-[0px_8px_24px_rgba(42,20,180,0.16)]"
                        : "border-[#e6e8f3] bg-[#f8f9ff] hover:bg-[#eff4ff]"
                    )}
                  >
                    <p className="text-sm font-semibold text-[#0b1c30]">{method.title}</p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-[0px_24px_40px_rgba(11,28,48,0.07)]">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#464554] mb-3">4. Boek</p>
          {!selectedMethod ? (
            <p className="text-sm text-[#464554]">Kies eerst een methode om boeken te tonen.</p>
          ) : booksLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-28 rounded-2xl bg-[#eff4ff] animate-pulse" />
              ))}
            </div>
          ) : filteredBooks.length === 0 ? (
            <EmptyState message={`Geen boeken gevonden voor ${selectedYear} en ${selectedLevel}.`} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredBooks.map((book) => {
                const key = getBookKey(book)
                const selected = selectedBookKey === key
                return (
                  <button
                    key={key}
                    onClick={() => onBookSelect(book)}
                    className={cn(
                      "group text-left rounded-2xl border transition-all overflow-visible",
                      selected
                        ? "border-[#2a14b4] bg-[#eff4ff] shadow-[0px_10px_28px_rgba(42,20,180,0.2)]"
                        : "border-[#e6e8f3] bg-[#f8f9ff] hover:bg-white hover:shadow-[0px_10px_24px_rgba(11,28,48,0.08)]"
                    )}
                  >
                    <div className="p-4 flex gap-3">
                      <div className="relative flex-shrink-0 w-11 h-16 group/cover">
                        {book.cover_url ? (
                          <>
                            <div className="w-full h-full rounded-lg overflow-hidden bg-[#dce9ff]">
                              <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                            </div>
                            <div className="pointer-events-none absolute left-0 top-0 z-30 opacity-0 scale-95 -translate-y-1 transition-all duration-200 ease-out group-hover/cover:opacity-100 group-hover/cover:scale-100 group-hover/cover:-translate-y-6">
                              <div className="w-[132px] h-[192px] p-1 rounded-xl bg-white shadow-[0px_16px_36px_rgba(11,28,48,0.26)] border border-white/80">
                                <img
                                  src={book.cover_url}
                                  alt={book.title}
                                  className="w-full h-full object-contain rounded-lg bg-[#f4f6ff]"
                                />
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full rounded-lg overflow-hidden bg-[#dce9ff] flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-[#5c5378]" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#0b1c30] leading-tight line-clamp-2">{book.title}</p>
                        {book.edition && <p className="text-xs text-[#464554] mt-1">{book.edition}</p>}
                        {book.subject_name && (
                          <p className="text-[11px] text-[#5c5378] mt-1 line-clamp-1">{book.subject_name}</p>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <Button disabled={!canContinue} className="gap-2" onClick={onConfirm}>
          Volgende stap
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-[#f8f9ff] rounded-2xl p-8 flex flex-col items-center gap-3 text-center border border-[#e6e8f3]">
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
