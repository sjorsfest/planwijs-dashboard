import { useRef, useEffect } from "react"
import { ArrowRight, BookOpen, ChevronDown, ChevronRight } from "lucide-react"
import type { Book, BookDetail } from "~/lib/api"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"
import type { Chapter, Paragraph } from "./types"

interface Props {
  selectedSubjectName: string
  selectedBook: Book
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
  onCreatePlan: () => void
}

export function Step6Paragraphs({
  selectedSubjectName,
  selectedBook,
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
  onCreatePlan,
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
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest">
            Stap 6 van 6
          </Badge>
          <Badge className="text-[10px] font-black uppercase tracking-widest bg-black text-white">
            {selectedSubjectName}
          </Badge>
        </div>
        <h1 className="text-4xl font-black mb-1">Kies je paragrafen</h1>
        <p className="text-sm text-black/60 font-medium mb-3">Selecteer de paragrafen die je wil behandelen.</p>

        <div className="flex items-center gap-2">
          {selectedBook.cover_url ? (
            <img src={selectedBook.cover_url} alt={selectedBook.title} className="w-5 h-7 object-cover border border-black/20 flex-shrink-0" />
          ) : (
            <BookOpen className="w-4 h-4 text-black/30 flex-shrink-0" />
          )}
          <span className="text-xs font-bold text-black/50">
            {selectedBook.title}
            {selectedBook.edition ? <span className="font-normal"> · {selectedBook.edition}</span> : null}
          </span>
        </div>
      </div>

      {bookDetailLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-2 border-black bg-white p-4 animate-pulse">
              <div className="h-4 bg-black/10 w-1/3" />
            </div>
          ))}
        </div>
      ) : !bookDetail || bookDetail.chapters.length === 0 ? (
        <EmptyState message="Geen hoofdstukken gevonden voor dit boek." />
      ) : (
        <>
          {/* Combo select */}
          <div className="mb-6" ref={comboRef}>
            <p className="text-xs font-black uppercase tracking-widest mb-2">Snel zoeken</p>
            <div className="relative">
              <button
                type="button"
                onClick={() => onComboOpenChange(!comboOpen)}
                className="w-full border-2 border-black bg-white px-3 py-2.5 text-sm font-medium text-left flex items-center justify-between hover:bg-[#fdf4c4] transition-colors"
              >
                <span className={selectedParagraphIds.length > 0 ? "text-black" : "text-black/40"}>
                  {selectedParagraphIds.length === 0
                    ? "Zoek een hoofdstuk of paragraaf…"
                    : `${selectedParagraphIds.length} paragraaf${selectedParagraphIds.length !== 1 ? "en" : ""} geselecteerd`}
                </span>
                <ChevronDown className={cn("w-4 h-4 text-black/50 transition-transform", comboOpen && "rotate-180")} />
              </button>

              {comboOpen && (
                <div className="absolute top-full left-0 right-0 z-30 border-2 border-t-0 border-black bg-white shadow-[4px_4px_0px_#000]">
                  <div className="border-b-2 border-black px-3 py-2">
                    <input
                      autoFocus
                      value={comboQuery}
                      onChange={(e) => onComboQueryChange(e.target.value)}
                      placeholder="Zoek op titel of hoofdstuk…"
                      className="w-full text-sm font-medium outline-none bg-transparent placeholder:text-black/30"
                    />
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {comboGroups.length === 0 ? (
                      <p className="px-3 py-3 text-sm text-black/40 font-medium">Niets gevonden.</p>
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
                                "w-full text-left px-3 py-1.5 flex items-center justify-between border-b border-black/10 transition-colors",
                                chapterFull ? "bg-[#c5d9f5] text-black" : "bg-black/5 hover:bg-[#fdf4c4]"
                              )}
                            >
                              <span className={cn("text-[10px] font-black uppercase tracking-widest", chapterFull ? "text-black/60" : "text-black/40")}>
                                Hfst {chapter.index}: {chapter.title}
                              </span>
                              {(chapterFull || chapterPartial) && (
                                <span className={cn("text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5", chapterFull ? "bg-black/10 text-black/70" : "bg-black/20 text-black/60")}>
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
                                    "w-full text-left pl-6 pr-3 py-2 text-sm font-medium border-b border-black/10 last:border-b-0 transition-colors",
                                    selected ? "bg-[#f9d5d3] text-black" : "bg-white hover:bg-[#fdf4c4]"
                                  )}
                                >
                                  <span className={cn("mr-1.5", selected ? "text-black/55" : "text-black/40")}>
                                    {chapter.index}.{paragraph.index}
                                  </span>
                                  {paragraph.title}
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
          <div className="space-y-1">
            {bookDetail.chapters.map((chapter) => {
              const isOpen = openChapters.includes(chapter.id)
              const chapterFull = isChapterFullySelected(chapter)
              const chapterPartial = isChapterPartiallySelected(chapter)
              return (
                <div key={chapter.id} className="border-2 border-black">
                  <div className={cn(
                    "flex items-stretch",
                    chapterFull ? "bg-[#c5d9f5] text-black" : chapterPartial ? "bg-[#fdf4c4]" : "bg-white"
                  )}>
                    <button
                      type="button"
                      onClick={() => onToggleChapter(chapter)}
                      className={cn(
                        "flex items-center justify-center w-10 flex-shrink-0 border-r-2 border-black transition-colors",
                        chapterFull ? "hover:bg-[#b8cced]" : "hover:bg-black/10"
                      )}
                      title={chapterFull ? "Deselecteer hoofdstuk" : "Selecteer heel hoofdstuk"}
                    >
                      <div className={cn(
                        "w-3.5 h-3.5 border-2 flex items-center justify-center flex-shrink-0",
                        chapterFull
                          ? "border-black bg-black"
                          : chapterPartial
                          ? "border-black bg-black/20"
                          : "border-black/40"
                      )}>
                        {chapterFull && <div className="w-1.5 h-1.5 bg-white" />}
                        {chapterPartial && <div className="w-1.5 h-0.5 bg-black/70" />}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleAccordion(chapter.id)}
                      className="flex-1 flex items-center justify-between px-4 py-3 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn("text-xs font-black w-6 flex-shrink-0", chapterFull ? "text-black/60" : "text-black/30")}>
                          {chapter.index}
                        </span>
                        <span className="font-black text-sm text-black">{chapter.title}</span>
                        <span className={cn("text-xs font-medium", chapterFull ? "text-black/60" : chapterPartial ? "text-black/60" : "text-black/40")}>
                          {chapterFull
                            ? "Alles geselecteerd"
                            : chapterPartial
                            ? `${chapter.paragraphs.filter((p) => isParagraphSelected(p.id)).length}/${chapter.paragraphs.length} geselecteerd`
                            : `${chapter.paragraphs.length} paragrafen`}
                        </span>
                      </div>
                      {isOpen
                        ? <ChevronDown className={cn("w-4 h-4 flex-shrink-0", chapterFull ? "text-black/60" : "text-black/40")} />
                        : <ChevronRight className={cn("w-4 h-4 flex-shrink-0", chapterFull ? "text-black/60" : "text-black/40")} />
                      }
                    </button>
                  </div>

                  {isOpen && (
                    <div className="border-t-2 border-black">
                      {chapter.paragraphs.map((paragraph) => {
                        const isSelected = isParagraphSelected(paragraph.id)
                        return (
                          <button
                            key={paragraph.id}
                            type="button"
                            onClick={() => onToggleParagraph(paragraph.id)}
                            className={cn(
                              "w-full flex items-start gap-3 px-4 py-3 text-left border-b border-black/10 last:border-b-0 transition-colors",
                              isSelected ? "bg-[#f9d5d3] text-black" : "bg-white hover:bg-[#fdf4c4]"
                            )}
                          >
                            <span className={cn("text-xs font-black w-8 flex-shrink-0 mt-0.5", isSelected ? "text-black/55" : "text-black/30")}>
                              {chapter.index}.{paragraph.index}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold leading-tight">{paragraph.title}</p>
                              {paragraph.synopsis && (
                                <p className={cn("text-xs mt-0.5 line-clamp-2", isSelected ? "text-black/65" : "text-black/50")}>
                                  {paragraph.synopsis}
                                </p>
                              )}
                            </div>
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
            <Button disabled={selectedParagraphIds.length === 0} className="gap-2" onClick={onCreatePlan}>
              Maak lesplan
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
