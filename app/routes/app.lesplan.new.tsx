import { useEffect, useState } from "react"
import { data, Link, redirect, useActionData, useFetcher, useNavigation, useSubmit } from "react-router"
import { ArrowLeft } from "lucide-react"
import { createClass, createLesplan, ApiRequestError, type Book, type BookDetail, type Subject } from "~/lib/api"
import { requireAuthContext } from "~/lib/auth.server"
import { Step1ClassSetup } from "~/components/new-plan/step1-class-setup"
import { Step2Subject } from "~/components/new-plan/step2-subject"
import { Step3ClassDetails } from "~/components/new-plan/step3-class-details"
import { Step4Method } from "~/components/new-plan/step4-method"
import { Step5Book } from "~/components/new-plan/step5-book"
import { Step6Paragraphs } from "~/components/new-plan/step6-paragraphs"
import { PlanSummary } from "~/components/new-plan/plan-summary"
import {
  getDisabledYears,
  type Chapter,
  type ClassDifficulty,
  type Level,
  type Method,
  type SchoolYear,
} from "~/components/new-plan/types"
import type { Route } from "./+types/app.lesplan.new"

type ActionData = {
  error?: string
}

type SavedPlanState = {
  selectedLevel: Level | null
  selectedYear: SchoolYear | null
  selectedSubject: Subject | null
  lessonCount: number | null
  lessonDuration: number | null
  classSize: number | null
  classDifficulty: ClassDifficulty | null
  classDetailsConfirmed: boolean
  selectedMethod: Method | null
  selectedBook: Book | null
  selectedParagraphIds: string[]
  showSummary: boolean
}

type SubmittedPlanPayload = {
  selectedLevel: Level
  selectedYear: SchoolYear
  selectedSubject: Subject
  lessonCount: number
  lessonDuration: number
  classSize: number
  classDifficulty: ClassDifficulty
  selectedBookId: string
  selectedParagraphIds: string[]
}

const PLAN_STATE_KEY = "planwijs_new_plan"
const SUBJECT_VALUES = new Set([
  "Aardrijkskunde",
  "Bedrijfseconomie",
  "Biologie",
  "Duits",
  "Economie",
  "Engels",
  "Frans",
  "Geschiedenis",
  "Grieks",
  "Latijn",
  "Levens beschouwing",
  "Maatschappijleer",
  "MAW",
  "Mens & Maatschappij",
  "Nask/Science",
  "Natuurkunde",
  "Nederlands",
  "Scheikunde",
  "Spaans",
  "Wiskunde",
  "Wiskunde A",
  "Wiskunde B",
  "Unknown",
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function parseSavedSubject(value: unknown): Subject | null {
  if (!isRecord(value)) return null
  if (
    typeof value.id !== "string" ||
    typeof value.slug !== "string" ||
    typeof value.name !== "string" ||
    typeof value.category !== "string"
  ) {
    return null
  }

  return {
    id: value.id,
    slug: value.slug,
    name: value.name,
    category: value.category,
    created_at: typeof value.created_at === "string" ? value.created_at : undefined,
    updated_at: typeof value.updated_at === "string" ? value.updated_at : undefined,
  }
}

function parseSavedMethod(value: unknown): Method | null {
  if (!isRecord(value)) return null
  if (
    typeof value.slug !== "string" ||
    typeof value.title !== "string" ||
    typeof value.subject !== "string" ||
    typeof value.url !== "string"
  ) {
    return null
  }

  return {
    id: typeof value.id === "string" ? value.id : undefined,
    created_at: typeof value.created_at === "string" ? value.created_at : undefined,
    updated_at: typeof value.updated_at === "string" ? value.updated_at : undefined,
    slug: value.slug,
    title: value.title,
    subject: value.subject as Method["subject"],
    url: value.url,
  }
}

function parseSavedBook(value: unknown): Book | null {
  if (!isRecord(value)) return null
  if (
    typeof value.slug !== "string" ||
    typeof value.title !== "string" ||
    typeof value.url !== "string"
  ) {
    return null
  }

  return {
    id: typeof value.id === "string" ? value.id : undefined,
    created_at: typeof value.created_at === "string" ? value.created_at : undefined,
    updated_at: typeof value.updated_at === "string" ? value.updated_at : undefined,
    book_id: typeof value.book_id === "number" ? value.book_id : null,
    slug: value.slug,
    title: value.title,
    subject_id: typeof value.subject_id === "string" ? value.subject_id : null,
    method_id: typeof value.method_id === "string" ? value.method_id : null,
    edition: typeof value.edition === "string" ? value.edition : null,
    school_years: Array.isArray(value.school_years) ? (value.school_years as Book["school_years"]) : [],
    levels: Array.isArray(value.levels) ? (value.levels as Book["levels"]) : [],
    cover_path: typeof value.cover_path === "string" ? value.cover_path : null,
    cover_url: typeof value.cover_url === "string" ? value.cover_url : null,
    url: value.url,
    subject_slug: typeof value.subject_slug === "string" ? value.subject_slug : null,
    subject_name: typeof value.subject_name === "string" ? value.subject_name : null,
    subject_category: typeof value.subject_category === "string" ? value.subject_category : null,
  }
}

function loadPlanState(): SavedPlanState | null {
  if (typeof window === "undefined") return null

  try {
    const raw = window.localStorage.getItem(PLAN_STATE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Record<string, unknown>

    return {
      selectedLevel: typeof parsed.selectedLevel === "string" ? (parsed.selectedLevel as Level) : null,
      selectedYear: typeof parsed.selectedYear === "string" ? (parsed.selectedYear as SchoolYear) : null,
      selectedSubject: parseSavedSubject(parsed.selectedSubject),
      lessonCount: typeof parsed.lessonCount === "number" ? parsed.lessonCount : null,
      lessonDuration: typeof parsed.lessonDuration === "number" ? parsed.lessonDuration : null,
      classSize: typeof parsed.classSize === "number" ? parsed.classSize : null,
      classDifficulty: typeof parsed.classDifficulty === "string" ? (parsed.classDifficulty as ClassDifficulty) : null,
      classDetailsConfirmed: parsed.classDetailsConfirmed === true,
      selectedMethod: parseSavedMethod(parsed.selectedMethod),
      selectedBook: parseSavedBook(parsed.selectedBook),
      selectedParagraphIds: isStringArray(parsed.selectedParagraphIds) ? parsed.selectedParagraphIds : [],
      showSummary: parsed.showSummary === true,
    }
  } catch {
    return null
  }
}

function parseSubmittedPayload(value: unknown): SubmittedPlanPayload | null {
  if (!isRecord(value)) return null

  const subject = parseSavedSubject(value.selectedSubject)
  if (!subject || !SUBJECT_VALUES.has(subject.name)) return null

  if (
    typeof value.selectedLevel !== "string" ||
    typeof value.selectedYear !== "string" ||
    typeof value.lessonCount !== "number" ||
    typeof value.lessonDuration !== "number" ||
    typeof value.classSize !== "number" ||
    typeof value.classDifficulty !== "string" ||
    typeof value.selectedBookId !== "string" ||
    !isStringArray(value.selectedParagraphIds) ||
    value.selectedParagraphIds.length === 0
  ) {
    return null
  }

  return {
    selectedLevel: value.selectedLevel as Level,
    selectedYear: value.selectedYear as SchoolYear,
    selectedSubject: subject,
    lessonCount: value.lessonCount,
    lessonDuration: value.lessonDuration,
    classSize: value.classSize,
    classDifficulty: value.classDifficulty as ClassDifficulty,
    selectedBookId: value.selectedBookId,
    selectedParagraphIds: value.selectedParagraphIds,
  }
}

export function meta() {
  return [{ title: "Nieuw lesplan — Planwijs" }]
}

export async function loader({ request }: Route.LoaderArgs) {
  requireAuthContext(request)
  return null
}

export async function action({ request }: Route.ActionArgs) {
  const { token, userId } = requireAuthContext(request)
  const formData = await request.formData()
  const rawPayload = formData.get("payload")

  if (typeof rawPayload !== "string") {
    return data<ActionData>({ error: "De lesplan-aanvraag is onvolledig." }, { status: 400 })
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(rawPayload)
  } catch {
    return data<ActionData>({ error: "De lesplan-aanvraag kon niet worden gelezen." }, { status: 400 })
  }

  const payload = parseSubmittedPayload(parsedJson)
  if (!payload) {
    return data<ActionData>({ error: "Niet alle verplichte velden zijn ingevuld." }, { status: 400 })
  }

  try {
    const classroom = await createClass(
      {
        user_id: userId,
        subject: payload.selectedSubject.name as Method["subject"],
        level: payload.selectedLevel,
        school_year: payload.selectedYear,
        size: payload.classSize,
        difficulty: payload.classDifficulty,
      },
      token
    )

    if (!classroom.id) {
      return data<ActionData>({ error: "De klas kon niet worden opgeslagen." }, { status: 500 })
    }

    const lesplan = await createLesplan(
      {
        user_id: userId,
        class_id: classroom.id,
        book_id: payload.selectedBookId,
        selected_paragraph_ids: payload.selectedParagraphIds,
        num_lessons: payload.lessonCount,
        lesson_duration_minutes: payload.lessonDuration,
      },
      token
    )

    return redirect(`/lesplan/${lesplan.id}`)
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return data<ActionData>({ error: error.message }, { status: error.status })
    }

    return data<ActionData>({ error: "Het lesplan kon niet worden aangemaakt." }, { status: 500 })
  }
}

export default function NewLesplanPage() {
  const actionData = useActionData<typeof action>() as ActionData | undefined
  const navigation = useNavigation()
  const submit = useSubmit()

  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null)
  const [selectedYear, setSelectedYear] = useState<SchoolYear | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [classDetailsConfirmed, setClassDetailsConfirmed] = useState(false)
  const [lessonCount, setLessonCount] = useState<number | null>(null)
  const [lessonDuration, setLessonDuration] = useState<number | null>(null)
  const [classSize, setClassSize] = useState<number | null>(null)
  const [classDifficulty, setClassDifficulty] = useState<ClassDifficulty | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<Method | null>(null)
  const [yearFilters, setYearFilters] = useState<SchoolYear[]>([])
  const [levelFilters, setLevelFilters] = useState<Level[]>([])
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [openChapters, setOpenChapters] = useState<string[]>([])
  const [comboQuery, setComboQuery] = useState("")
  const [comboOpen, setComboOpen] = useState(false)
  const [selectedParagraphIds, setSelectedParagraphIds] = useState<string[]>([])
  const [showSummary, setShowSummary] = useState(false)
  const [draftHydrated, setDraftHydrated] = useState(false)

  const subjectsFetcher = useFetcher<Subject[]>()
  const methodsFetcher = useFetcher<Method[]>()
  const booksFetcher = useFetcher<Book[]>()
  const bookDetailFetcher = useFetcher<BookDetail>()

  const subjects = subjectsFetcher.data ?? []
  const methods = methodsFetcher.data ?? []
  const books = booksFetcher.data ?? []
  const bookDetail = bookDetailFetcher.data ?? null
  const selectedSubjectName = selectedSubject?.name ?? ""
  const shouldHaveSubjects = selectedLevel !== null && selectedYear !== null
  const isSubmitting = navigation.state !== "idle"

  const subjectsLoading =
    subjectsFetcher.state === "loading" ||
    (shouldHaveSubjects && subjectsFetcher.data === undefined)

  const methodsLoading =
    methodsFetcher.state === "loading" ||
    (selectedSubject !== null && methodsFetcher.data === undefined)

  const booksLoading =
    booksFetcher.state === "loading" ||
    (selectedMethod !== null && booksFetcher.data === undefined)

  const bookDetailLoading =
    bookDetailFetcher.state === "loading" ||
    (selectedBook !== null && bookDetailFetcher.data === undefined)

  const filteredBooks = books.filter((book) => {
    const yearOk = yearFilters.length === 0 || (book.school_years ?? []).some((year) => yearFilters.includes(year))
    const levelOk = levelFilters.length === 0 || (book.levels ?? []).some((level) => levelFilters.includes(level))
    return yearOk && levelOk
  })

  const classDetailsValid =
    lessonCount !== null &&
    lessonCount > 0 &&
    lessonDuration !== null &&
    lessonDuration > 0 &&
    classSize !== null &&
    classSize > 0 &&
    classDifficulty !== null

  const step =
    !selectedLevel || !selectedYear ? 1
    : !selectedSubject ? 2
    : !classDetailsConfirmed ? 3
    : !selectedMethod ? 4
    : !selectedBook ? 5
    : 6

  useEffect(() => {
    const saved = loadPlanState()
    if (!saved) {
      setDraftHydrated(true)
      return
    }

    setSelectedLevel(saved.selectedLevel)
    setSelectedYear(saved.selectedYear)
    setSelectedSubject(saved.selectedSubject)
    setClassDetailsConfirmed(saved.classDetailsConfirmed)
    setLessonCount(saved.lessonCount)
    setLessonDuration(saved.lessonDuration)
    setClassSize(saved.classSize)
    setClassDifficulty(saved.classDifficulty)
    setSelectedMethod(saved.selectedMethod)
    setYearFilters(saved.selectedYear ? [saved.selectedYear] : [])
    setLevelFilters(saved.selectedLevel ? [saved.selectedLevel] : [])
    setSelectedBook(saved.selectedBook)
    setSelectedParagraphIds(saved.selectedParagraphIds)
    setShowSummary(saved.showSummary)
    setDraftHydrated(true)
  }, [])

  useEffect(() => {
    if (step < 2) return
    if (subjectsFetcher.data !== undefined || subjectsFetcher.state !== "idle") return
    subjectsFetcher.load("/api/subjects")
  }, [step, subjectsFetcher.data, subjectsFetcher.state])

  useEffect(() => {
    if (!selectedSubject || methodsFetcher.data !== undefined || methodsFetcher.state !== "idle") return
    const params = new URLSearchParams({ subject_id: selectedSubject.id, subject_name: selectedSubject.name })
    methodsFetcher.load(`/api/methods?${params.toString()}`)
  }, [selectedSubject, methodsFetcher.data, methodsFetcher.state])

  useEffect(() => {
    if (!selectedMethod || booksFetcher.data !== undefined || booksFetcher.state !== "idle") return
    const params = new URLSearchParams()
    if (selectedMethod.id) params.set("method_id", selectedMethod.id)
    if (selectedSubject?.id) params.set("subject_id", selectedSubject.id)
    booksFetcher.load(`/api/books?${params.toString()}`)
  }, [selectedMethod, selectedSubject, booksFetcher.data, booksFetcher.state])

  useEffect(() => {
    if (!selectedBook?.id || bookDetailFetcher.data !== undefined || bookDetailFetcher.state !== "idle") return
    bookDetailFetcher.load(`/api/book/${selectedBook.id}`)
  }, [selectedBook, bookDetailFetcher.data, bookDetailFetcher.state])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!draftHydrated) return

    const draft: SavedPlanState = {
      selectedLevel,
      selectedYear,
      selectedSubject,
      lessonCount,
      lessonDuration,
      classSize,
      classDifficulty,
      classDetailsConfirmed,
      selectedMethod,
      selectedBook,
      selectedParagraphIds,
      showSummary,
    }

    window.localStorage.setItem(PLAN_STATE_KEY, JSON.stringify(draft))
  }, [
    selectedLevel,
    selectedYear,
    selectedSubject,
    lessonCount,
    lessonDuration,
    classSize,
    classDifficulty,
    classDetailsConfirmed,
    selectedMethod,
    selectedBook,
    selectedParagraphIds,
    showSummary,
    draftHydrated,
  ])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!navigation.location?.pathname.startsWith("/lesplan/")) return
    window.localStorage.removeItem(PLAN_STATE_KEY)
  }, [navigation.location?.pathname])

  function handleLevelSelect(level: Level) {
    setSelectedLevel(level)
    if (selectedYear && getDisabledYears(level).includes(selectedYear)) {
      setSelectedYear(null)
    }
  }

  function handleBack() {
    if (showSummary) {
      setShowSummary(false)
      return
    }

    if (step === 6) {
      setSelectedBook(null)
      setOpenChapters([])
      setComboQuery("")
      setComboOpen(false)
      setSelectedParagraphIds([])
    } else if (step === 5) {
      setSelectedMethod(null)
      setYearFilters(selectedYear ? [selectedYear] : [])
      setLevelFilters(selectedLevel ? [selectedLevel] : [])
    } else if (step === 4) {
      setClassDetailsConfirmed(false)
    } else if (step === 3) {
      setSelectedSubject(null)
    } else {
      setSelectedLevel(null)
      setSelectedYear(null)
    }
  }

  function handleSubjectSelect(subject: Subject) {
    setSelectedSubject(subject)
    setSelectedMethod(null)
    setSelectedBook(null)
    setSelectedParagraphIds([])
    setShowSummary(false)

    const params = new URLSearchParams({ subject_id: subject.id, subject_name: subject.name })
    methodsFetcher.load(`/api/methods?${params.toString()}`)
  }

  function handleMethodSelect(method: Method) {
    setSelectedMethod(method)
    setSelectedBook(null)
    setSelectedParagraphIds([])
    setShowSummary(false)
    setYearFilters(selectedYear ? [selectedYear] : [])
    setLevelFilters(selectedLevel ? [selectedLevel] : [])

    const params = new URLSearchParams()
    if (method.id) params.set("method_id", method.id)
    if (selectedSubject?.id) params.set("subject_id", selectedSubject.id)
    booksFetcher.load(`/api/books?${params.toString()}`)
  }

  function handleBookSelect(book: Book) {
    setSelectedBook(book)
    setOpenChapters([])
    setSelectedParagraphIds([])
    setComboQuery("")
    setShowSummary(false)
    if (book.id) bookDetailFetcher.load(`/api/book/${book.id}`)
  }

  function toggleYear(year: SchoolYear) {
    setYearFilters((prev) => prev.includes(year) ? prev.filter((item) => item !== year) : [...prev, year])
  }

  function toggleLevel(level: Level) {
    setLevelFilters((prev) => prev.includes(level) ? prev.filter((item) => item !== level) : [...prev, level])
  }

  function toggleAccordion(id: string) {
    setOpenChapters((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id])
  }

  function isParagraphSelected(id: string) {
    return selectedParagraphIds.includes(id)
  }

  function isChapterFullySelected(chapter: Chapter) {
    return chapter.paragraphs.length > 0 && chapter.paragraphs.every((paragraph) => selectedParagraphIds.includes(paragraph.id))
  }

  function isChapterPartiallySelected(chapter: Chapter) {
    return chapter.paragraphs.some((paragraph) => selectedParagraphIds.includes(paragraph.id)) && !isChapterFullySelected(chapter)
  }

  function toggleParagraph(paragraphId: string) {
    setSelectedParagraphIds((prev) =>
      prev.includes(paragraphId) ? prev.filter((id) => id !== paragraphId) : [...prev, paragraphId]
    )
  }

  function toggleChapterSelection(chapter: Chapter) {
    const allIds = chapter.paragraphs.map((paragraph) => paragraph.id)
    if (isChapterFullySelected(chapter)) {
      setSelectedParagraphIds((prev) => prev.filter((id) => !allIds.includes(id)))
    } else {
      setSelectedParagraphIds((prev) => [...new Set([...prev, ...allIds])])
    }
  }

  function handleCreateLesplan() {
    if (
      !selectedLevel ||
      !selectedYear ||
      !selectedSubject ||
      !lessonCount ||
      !lessonDuration ||
      !classSize ||
      !classDifficulty ||
      !selectedBook?.id ||
      selectedParagraphIds.length === 0
    ) {
      return
    }

    const formData = new FormData()
    formData.set(
      "payload",
      JSON.stringify({
        selectedLevel,
        selectedYear,
        selectedSubject,
        lessonCount,
        lessonDuration,
        classSize,
        classDifficulty,
        selectedBookId: selectedBook.id,
        selectedParagraphIds,
      })
    )

    submit(formData, { method: "post" })
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        {step === 1 ? (
          <Link
            to="/plans"
            className="flex items-center gap-2 text-sm font-bold text-black/60 hover:text-black transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Plannen
          </Link>
        ) : (
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-sm font-bold text-black/60 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Terug
          </button>
        )}
      </div>

      {step === 1 && (
        <Step1ClassSetup
          selectedLevel={selectedLevel}
          selectedYear={selectedYear}
          onLevelSelect={handleLevelSelect}
          onYearSelect={setSelectedYear}
        />
      )}

      {step === 2 && selectedLevel && selectedYear && (
        <Step2Subject
          selectedLevel={selectedLevel}
          selectedYear={selectedYear}
          subjects={subjects}
          subjectsLoading={subjectsLoading}
          onSubjectSelect={handleSubjectSelect}
        />
      )}

      {step === 3 && (
        <Step3ClassDetails
          selectedSubjectName={selectedSubjectName}
          lessonCount={lessonCount}
          lessonDuration={lessonDuration}
          classSize={classSize}
          classDifficulty={classDifficulty}
          classDetailsValid={classDetailsValid}
          onLessonCountChange={setLessonCount}
          onLessonDurationChange={setLessonDuration}
          onClassSizeChange={setClassSize}
          onClassDifficultyChange={setClassDifficulty}
          onConfirm={() => setClassDetailsConfirmed(true)}
        />
      )}

      {step === 4 && (
        <Step4Method
          selectedSubjectName={selectedSubjectName}
          methods={methods}
          methodsLoading={methodsLoading}
          onMethodSelect={handleMethodSelect}
        />
      )}

      {step === 5 && selectedMethod && (
        <Step5Book
          selectedSubjectName={selectedSubjectName}
          selectedMethod={selectedMethod}
          books={books}
          filteredBooks={filteredBooks}
          booksLoading={booksLoading}
          yearFilters={yearFilters}
          levelFilters={levelFilters}
          onToggleYear={toggleYear}
          onToggleLevel={toggleLevel}
          onBookSelect={handleBookSelect}
        />
      )}

      {step === 6 && selectedBook && !showSummary && (
        <Step6Paragraphs
          selectedSubjectName={selectedSubjectName}
          selectedBook={selectedBook}
          bookDetail={bookDetail}
          bookDetailLoading={bookDetailLoading}
          openChapters={openChapters}
          comboQuery={comboQuery}
          comboOpen={comboOpen}
          selectedParagraphIds={selectedParagraphIds}
          onToggleAccordion={toggleAccordion}
          onComboQueryChange={setComboQuery}
          onComboOpenChange={setComboOpen}
          onToggleParagraph={toggleParagraph}
          onToggleChapter={toggleChapterSelection}
          isParagraphSelected={isParagraphSelected}
          isChapterFullySelected={isChapterFullySelected}
          isChapterPartiallySelected={isChapterPartiallySelected}
          onCreatePlan={() => setShowSummary(true)}
        />
      )}

      {showSummary && selectedBook && selectedSubject &&
        selectedMethod && selectedLevel && selectedYear &&
        classDifficulty && lessonCount && lessonDuration && classSize && (
        <PlanSummary
          selectedLevel={selectedLevel}
          selectedYear={selectedYear}
          selectedSubject={selectedSubject}
          lessonCount={lessonCount}
          lessonDuration={lessonDuration}
          classSize={classSize}
          classDifficulty={classDifficulty}
          selectedMethod={selectedMethod}
          selectedBook={selectedBook}
          bookDetail={bookDetail}
          selectedParagraphIds={selectedParagraphIds}
          onBack={() => setShowSummary(false)}
          onConfirm={handleCreateLesplan}
          submitting={isSubmitting}
          submitError={actionData?.error ?? null}
          submitLabel="Genereer lesplan"
        />
      )}
    </div>
  )
}
