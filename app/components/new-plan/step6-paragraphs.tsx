import { useRef, useEffect } from "react"
import { ArrowRight, BookOpen, Check, ChevronDown, ChevronRight } from "lucide-react"
import type { Book, BookDetail } from "~/lib/api"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { SubjectBadge } from "~/components/ui/subject-badge"
import { cn } from "~/lib/utils"
import type { Chapter, Paragraph } from "./types"

interface Props {
  selectedSubjectName: string
  selectedBook: Book
  lessonCount: number | null
  bookDetail: BookDetail | null
  bookDetailLoading: boolean
  openChapters: string[]
  comboQuery: string
  comboOpen: boolean
  selectedParagraphIds: string[]
  onToggleAccordion: (id: string) => void
  onComboQueryChange: (query: string) => void
  onComboOpenChange: (open: boolean) => void
  onToggleParagraph: (id: string) => void
  onToggleChapter: (chapter: Chapter) => void
  isParagraphSelected: (id: string) => boolean
  isChapterFullySelected: (chapter: Chapter) => boolean
  isChapterPartiallySelected: (chapter: Chapter) => boolean
  onLessonCountChange: (value: number | null) => void
  onContinueToSummary: () => void
}

const LESSON_COUNT_OPTIONS = [2, 3, 4, 6, 8]

export function Step6Paragraphs({
  selectedSubjectName,
  selectedBook,
  lessonCount,
  bookDetail,
  bookDetailLoading,
  openChapters,
  comboQuery,
  comboOpen,
  selectedParagraphIds,
  onToggleAccordion,
  onComboQueryChange,
  onComboOpenChange,
  onToggleParagraph,
  onToggleChapter,
  isParagraphSelected,
  isChapterFullySelected,
  isChapterPartiallySelected,
  onLessonCountChange,
  onContinueToSummary,
}: Props) {
  const comboRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        onComboOpenChange(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [onComboOpenChange])

  const allParagraphs: { chapter: Chapter; paragraph: Paragraph; label: string }[] =
    (bookDetail?.chapters ?? []).flatMap((chapter) =>
      chapter.paragraphs.map((p) => ({
        chapter,
        paragraph: p,
        label: `${chapter.index}.${p.index} ${p.title}`,
      }))
    )

  const filteredParagraphs = comboQuery.trim()
    ? allParagraphs.filter(({ chapter, label }) =>
        label.toLowerCase().includes(comboQuery.toLowerCase()) ||
        chapter.title.toLowerCase().includes(comboQuery.toLowerCase())
      )
    : allParagraphs

  const comboGroups: { chapter: Chapter; paragraphs: typeof filteredParagraphs }[] = []
  for (const item of filteredParagraphs) {
    const existing = comboGroups.find((g) => g.chapter.id === item.chapter.id)
    if (existing) existing.paragraphs.push(item)
    else comboGroups.push({ chapter: item.chapter, paragraphs: [item] })
  }

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-widest">
            Stap 3 van 3
          </Badge>
          <SubjectBadge
            subjectName={selectedSubjectName}
            variant="default"
            className="text-[10px] font-semibold uppercase tracking-widest"
          />
        </div>
        <h1 className="text-4xl font-bold mb-1.5 text-[#0b1c30]">Inhoud en lesaantal</h1>
        <p className="text-sm text-[#464554] mb-3">
          Selecteer de paragrafen die je wil behandelen en geef aan hoeveel lessen je nodig hebt.
        </p>

        <div className="flex items-center gap-2">
          {selectedBook.cover_url ? (
            <img src={selectedBook.cover_url} alt={selectedBook.title} className="w-5 h-7 object-cover rounded flex-shrink-0" />
          ) : (
            <BookOpen className="w-4 h-4 text-[#5c5378] flex-shrink-0" />
          )}
          <span className="text-xs font-medium text-[#464554]">
            {selectedBook.title}
            {selectedBook.edition ? <span className="font-normal"> · {selectedBook.edition}</span> : null}
          </span>
        </div>
      </div>

      <div className="mb-6 bg-white rounded-2xl p-5 shadow-[0px_24px_40px_rgba(11,28,48,0.07)]">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#464554] mb-3">Aantal lessen</p>
        <div className="flex flex-wrap gap-2">
          {LESSON_COUNT_OPTIONS.map((count) => (
            <button
              key={count}
              onClick={() => onLessonCountChange(count)}
              className={cn(
                "px-3 py-2 text-sm font-semibold rounded-lg transition-all",
                lessonCount === count
                  ? "bg-gradient-to-br from-[#2a14b4] to-[#4338ca] text-white shadow-[0px_4px_12px_rgba(42,20,180,0.25)]"
                  : "bg-[#eff4ff] text-[#0b1c30] hover:bg-[#dce9ff]"
              )}
            >
              {count} lessen
            </button>
          ))}
          <input
            type="number"
            min={1}
            max={99}
            value={lessonCount !== null && !LESSON_COUNT_OPTIONS.includes(lessonCount) ? lessonCount : ""}
            onChange={(e) =>
              onLessonCountChange(e.target.value === "" ? null : Math.max(1, parseInt(e.target.value, 10) || 1))
            }
            placeholder="Anders"
            className="w-24 h-10 rounded-lg bg-[#dce9ff] px-3 text-sm font-semibold text-[#0b1c30] outline-none focus:ring-2 focus:ring-[#2a14b4]/35"
          />
        </div>
      </div>

      {bookDetailLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-[#eff4ff] rounded-2xl p-4 animate-pulse">
              <div className="h-4 bg-[#0b1c30]/10 w-1/3 rounded" />
            </div>
          ))}
        </div>
      ) : !bookDetail || bookDetail.chapters.length === 0 ? (
        <EmptyState message="Geen hoofdstukken gevonden voor dit boek." />
      ) : (
        <>
          {/* Combo select */}
          <div className="mb-6" ref={comboRef}>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#464554]/60 mb-2">Snel zoeken</p>
            <div className="relative">
              <button
                type="button"
                onClick={() => onComboOpenChange(!comboOpen)}
                className="w-full bg-[#dce9ff] rounded-2xl px-4 py-2.5 text-sm font-medium text-left flex items-center justify-between hover:bg-[#d3e4fe] transition-colors"
              >
                <span className={selectedParagraphIds.length > 0 ? "text-[#0b1c30]" : "text-[#464554]/60"}>
                  {selectedParagraphIds.length === 0
                    ? "Zoek een hoofdstuk of paragraaf…"
                    : `${selectedParagraphIds.length} paragraaf${selectedParagraphIds.length !== 1 ? "en" : ""} geselecteerd`}
                </span>
                <ChevronDown className={cn("w-4 h-4 text-[#5c5378] transition-transform", comboOpen && "rotate-180")} />
              </button>

              {comboOpen && (
                <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white rounded-2xl shadow-[0px_24px_40px_rgba(11,28,48,0.15)] overflow-hidden">
                  <div className="px-4 py-2.5 bg-[#eff4ff]">
                    <input
                      autoFocus
                      value={comboQuery}
                      onChange={(e) => onComboQueryChange(e.target.value)}
                      placeholder="Zoek op titel of hoofdstuk…"
                      className="w-full text-sm font-medium outline-none bg-transparent placeholder:text-[#464554]/50 text-[#0b1c30]"
                    />
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {comboGroups.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-[#464554] font-medium">Niets gevonden.</p>
                    ) : (
                      comboGroups.map(({ chapter, paragraphs }) => {
                        const chapterFull = isChapterFullySelected(chapter)
                        const chapterPartial = isChapterPartiallySelected(chapter)
                        return (
                          <div key={chapter.id}>
                            <button
                              type="button"
                              onClick={() => {
                                onToggleChapter(chapter)
                                if (!openChapters.includes(chapter.id)) {
                                  onToggleAccordion(chapter.id)
                                }
                              }}
                              className={cn(
                                "w-full text-left px-4 py-2 flex items-center justify-between transition-colors",
                                chapterFull ? "bg-[#dce9ff] text-[#0b1c30]" : "bg-[#f8f9ff] hover:bg-[#eff4ff]"
                              )}
                            >
                              <span className={cn("text-[10px] font-semibold uppercase tracking-widest", chapterFull ? "text-[#2a14b4]" : "text-[#464554]/60")}>
                                Hfst {chapter.index}: {chapter.title}
                              </span>
                              {(chapterFull || chapterPartial) && (
                                <span className={cn("text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full", chapterFull ? "bg-[#2a14b4]/10 text-[#2a14b4]" : "bg-[#ffdf9f] text-[#4c3700]")}>
                                  {chapterFull ? "Alles" : "Deels"}
                                </span>
                              )}
                            </button>
                            {paragraphs.map(({ paragraph }) => {
                              const selected = isParagraphSelected(paragraph.id)
                              return (
                                <button
                                  key={paragraph.id}
                                  type="button"
                                  onClick={() => {
                                    onToggleParagraph(paragraph.id)
                                    if (!openChapters.includes(chapter.id)) {
                                      onToggleAccordion(chapter.id)
                                    }
                                  }}
                                  className={cn(
                                    "w-full text-left pl-8 pr-4 py-2 text-sm font-medium transition-colors border-l-4 flex items-center justify-between gap-2",
                                    selected
                                      ? "border-l-[#2a14b4] bg-[#e3ecff] text-[#2a14b4]"
                                      : "border-l-transparent bg-white hover:bg-[#f8f9ff]"
                                  )}
                                >
                                  <span>
                                    <span className={cn("mr-1.5 text-xs", selected ? "text-[#2a14b4]/75" : "text-[#464554]/50")}>
                                      {chapter.index}.{paragraph.index}
                                    </span>
                                    {paragraph.title}
                                  </span>
                                  {selected && <Check className="w-3.5 h-3.5 text-[#2a14b4] flex-shrink-0" aria-hidden />}
                                </button>
                              )
                            })}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Accordion */}
          <div className="space-y-2">
            {bookDetail.chapters.map((chapter) => {
              const isOpen = openChapters.includes(chapter.id)
              const chapterFull = isChapterFullySelected(chapter)
              const chapterPartial = isChapterPartiallySelected(chapter)
              return (
                <div key={chapter.id} className={cn(
                  "rounded-2xl overflow-hidden",
                  chapterFull ? "shadow-[0px_8px_20px_rgba(42,20,180,0.12)]" : "shadow-[0px_4px_12px_rgba(11,28,48,0.06)]"
                )}>
                  <div className={cn(
                    "flex items-stretch",
                    chapterFull ? "bg-[#dce9ff]" : chapterPartial ? "bg-[#ffdf9f]/30" : "bg-white"
                  )}>
                    <button
                      type="button"
                      onClick={() => onToggleChapter(chapter)}
                      className={cn(
                        "flex items-center justify-center w-11 flex-shrink-0 transition-colors",
                        chapterFull ? "hover:bg-[#2a14b4]/10" : "hover:bg-[#0b1c30]/5"
                      )}
                      title={chapterFull ? "Deselecteer hoofdstuk" : "Selecteer heel hoofdstuk"}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all",
                        chapterFull
                          ? "bg-gradient-to-br from-[#2a14b4] to-[#4338ca]"
                          : chapterPartial
                          ? "bg-[#ffdf9f] border-2 border-[#f9bd22]"
                          : "border-2 border-[#c7c4d7]"
                      )}>
                        {chapterFull && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
                        {chapterPartial && <div className="w-2 h-0.5 bg-[#4c3700] rounded" />}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleAccordion(chapter.id)}
                      className="flex-1 flex items-center justify-between px-4 py-3 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn("text-xs font-semibold w-6 flex-shrink-0", chapterFull ? "text-[#2a14b4]/60" : "text-[#464554]/40")}>
                          {chapter.index}
                        </span>
                        <span className="font-semibold text-sm text-[#0b1c30]">{chapter.title}</span>
                        <span className={cn("text-xs", chapterFull ? "text-[#2a14b4]/70" : chapterPartial ? "text-[#4c3700]" : "text-[#464554]/50")}>
                          {chapterFull
                            ? "Alles geselecteerd"
                            : chapterPartial
                            ? `${chapter.paragraphs.filter((p) => isParagraphSelected(p.id)).length}/${chapter.paragraphs.length} geselecteerd`
                            : `${chapter.paragraphs.length} paragrafen`}
                        </span>
                      </div>
                      {isOpen
                        ? <ChevronDown className={cn("w-4 h-4 flex-shrink-0", chapterFull ? "text-[#2a14b4]/60" : "text-[#464554]/40")} />
                        : <ChevronRight className={cn("w-4 h-4 flex-shrink-0", chapterFull ? "text-[#2a14b4]/60" : "text-[#464554]/40")} />
                      }
                    </button>
                  </div>

                  {isOpen && (
                    <div>
                      {chapter.paragraphs.map((paragraph) => {
                        const isSelected = isParagraphSelected(paragraph.id)
                        return (
                          <button
                            key={paragraph.id}
                            type="button"
                            onClick={() => onToggleParagraph(paragraph.id)}
                            className={cn(
                              "group w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-l-4 border-b border-[#edf0f8]",
                              isSelected
                                ? "border-l-[#2a14b4] bg-[#dde8ff] shadow-[inset_0_0_0_1px_rgba(42,20,180,0.22)]"
                                : "border-l-transparent bg-white hover:bg-[#f6f8ff]"
                            )}
                          >
                            <span className={cn(
                              "text-xs font-semibold w-8 flex-shrink-0 mt-0.5",
                              isSelected ? "text-[#2a14b4]/80" : "text-[#464554]/55"
                            )}>
                              {chapter.index}.{paragraph.index}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-sm font-medium leading-tight", isSelected ? "text-[#1f1491] font-semibold" : "text-[#0b1c30]")}>{paragraph.title}</p>
                              {paragraph.synopsis && (
                                <p className={cn("text-xs mt-0.5 line-clamp-2", isSelected ? "text-[#1f1491]/70" : "text-[#464554]/65")}>
                                  {paragraph.synopsis}
                                </p>
                              )}
                            </div>
                            <span
                              className={cn(
                                "mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                                isSelected
                                  ? "bg-[#2a14b4] text-white"
                                  : "border border-[#c6cbe0] text-transparent group-hover:text-[#8b93b8]"
                              )}
                              aria-hidden
                            >
                              <Check className="w-3 h-3" />
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-8">
            <Button
              disabled={selectedParagraphIds.length === 0 || lessonCount === null || lessonCount < 1}
              className="gap-2"
              onClick={onContinueToSummary}
            >
              Bekijk overzicht
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </>
      )}
    </>
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
