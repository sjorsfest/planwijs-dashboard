import { useEffect, useState } from "react"
import { data, Link, redirect, useActionData, useFetcher, useLoaderData, useNavigation, useSubmit } from "react-router"
import { ArrowLeft } from "lucide-react"
import {
  createClass,
  createLesplan,
  getClasses,
  listLespannen,
  ApiRequestError,
  type Book,
  type BookDetail,
  type Class,
  type LesplanResponse,
  type Subject,
} from "~/lib/api"
import { requireAuthContext } from "~/lib/auth.server"
import { SUBJECT_VALUES } from "~/lib/subject-metadata"
import { Step1ClassSetup, type ExistingClassOption } from "~/components/new-plan/step1-class-setup"
import { Step2Subject } from "~/components/new-plan/step2-subject"
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
  classSelectionMode: "choose" | "create"
  selectedExistingClassId: string | null
  selectedLevel: Level | null
  selectedYear: SchoolYear | null
  selectedCategory: string | null
  selectedSubject: Subject | null
  lessonCount: number | null
  lessonDuration: number | null
  classSize: number | null
  classDifficulty: ClassDifficulty | null
  classSetupConfirmed: boolean
  curriculumConfirmed: boolean
  selectedMethod: Method | null
  selectedBook: Book | null
  selectedParagraphIds: string[]
  showSummary: boolean
}

type SubmittedPlanPayload = {
  selectedExistingClassId: string | null
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

type ExistingClassData = ExistingClassOption & {
  latestLesplanBookId: string | null
  latestLesplanLessonDuration: number | null
  latestLesplanNumLessons: number | null
}

type LoaderData = {
  existingClasses: ExistingClassData[]
}

const PLAN_STATE_KEY = "planwijs_new_plan"

function normalizeSubjectCategory(category: string | null | undefined): string {
  const trimmed = category?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : "Overig"
}

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
      classSelectionMode: parsed.classSelectionMode === "create" ? "create" : "choose",
      selectedExistingClassId:
        typeof parsed.selectedExistingClassId === "string" && parsed.selectedExistingClassId.length > 0
          ? parsed.selectedExistingClassId
          : null,
      selectedLevel: typeof parsed.selectedLevel === "string" ? (parsed.selectedLevel as Level) : null,
      selectedYear: typeof parsed.selectedYear === "string" ? (parsed.selectedYear as SchoolYear) : null,
      selectedCategory: typeof parsed.selectedCategory === "string" ? parsed.selectedCategory : null,
      selectedSubject: parseSavedSubject(parsed.selectedSubject),
      lessonCount: typeof parsed.lessonCount === "number" ? parsed.lessonCount : null,
      lessonDuration: typeof parsed.lessonDuration === "number" ? parsed.lessonDuration : null,
      classSize: typeof parsed.classSize === "number" ? parsed.classSize : null,
      classDifficulty: typeof parsed.classDifficulty === "string" ? (parsed.classDifficulty as ClassDifficulty) : null,
      classSetupConfirmed:
        parsed.classSetupConfirmed === true ||
        parsed.classDetailsConfirmed === true,
      curriculumConfirmed: parsed.curriculumConfirmed === true,
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
    selectedExistingClassId:
      typeof value.selectedExistingClassId === "string" && value.selectedExistingClassId.length > 0
        ? value.selectedExistingClassId
        : null,
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

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return {
    "Cache-Control": loaderHeaders.get("Cache-Control") ?? "",
  }
}

function hasClassId(classroom: Class): classroom is Class & { id: string } {
  return typeof classroom.id === "string" && classroom.id.length > 0
}

function getLatestLesplanByClassId(lespannen: LesplanResponse[]): Map<string, LesplanResponse> {
  const latest = new Map<string, LesplanResponse>()

  for (const lesplan of lespannen) {
    const current = latest.get(lesplan.class_id)
    if (!current) {
      latest.set(lesplan.class_id, lesplan)
      continue
    }

    const currentTs = new Date(current.updated_at).getTime()
    const nextTs = new Date(lesplan.updated_at).getTime()
    if (Number.isNaN(currentTs) || nextTs > currentTs) {
      latest.set(lesplan.class_id, lesplan)
    }
  }

  return latest
}

export async function loader({ request }: Route.LoaderArgs) {
  const { token } = await requireAuthContext(request)

  const [classes, lespannen] = await Promise.all([
    getClasses(token),
    listLespannen(token),
  ])

  const latestByClassId = getLatestLesplanByClassId(lespannen)

  const existingClasses: ExistingClassData[] = classes
    .filter(hasClassId)
    .map((classroom) => {
      const latestLesplan = latestByClassId.get(classroom.id) ?? null

      return {
        id: classroom.id,
        subject: classroom.subject,
        level: classroom.level,
        schoolYear: classroom.school_year,
        size: classroom.size,
        difficulty: classroom.difficulty ?? null,
        latestLesplanUpdatedAt: latestLesplan?.updated_at ?? null,
        latestLesplanBookId: latestLesplan?.book_id ?? null,
        latestLesplanLessonDuration: latestLesplan?.lesson_duration_minutes ?? null,
        latestLesplanNumLessons: latestLesplan?.num_lessons ?? null,
      }
    })
    .sort((a, b) => {
      const left = a.latestLesplanUpdatedAt ? new Date(a.latestLesplanUpdatedAt).getTime() : 0
      const right = b.latestLesplanUpdatedAt ? new Date(b.latestLesplanUpdatedAt).getTime() : 0
      if (right !== left) return right - left
      return a.subject.localeCompare(b.subject, "nl")
    })

  return data<LoaderData>({ existingClasses }, { headers: { "Cache-Control": "private, max-age=10" } })
}

export async function action({ request }: Route.ActionArgs) {
  const { token } = await requireAuthContext(request)
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
    let classId = payload.selectedExistingClassId

    if (!classId) {
      const classroom = await createClass(
        {
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

      classId = classroom.id
    }

    const lesplan = await createLesplan(
      {
        class_id: classId,
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
  const { existingClasses } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>() as ActionData | undefined
  const navigation = useNavigation()
  const submit = useSubmit()

  const hasExistingClasses = existingClasses.length > 0
  const [classSelectionMode, setClassSelectionMode] = useState<"choose" | "create">(
    hasExistingClasses ? "choose" : "create"
  )
  const [selectedExistingClassId, setSelectedExistingClassId] = useState<string | null>(null)
  const [existingClassPrefillBookId, setExistingClassPrefillBookId] = useState<string | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null)
  const [selectedYear, setSelectedYear] = useState<SchoolYear | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [classSetupConfirmed, setClassSetupConfirmed] = useState(false)
  const [curriculumConfirmed, setCurriculumConfirmed] = useState(false)
  const [lessonCount, setLessonCount] = useState<number | null>(null)
  const [lessonDuration, setLessonDuration] = useState<number | null>(null)
  const [classSize, setClassSize] = useState<number | null>(null)
  const [classDifficulty, setClassDifficulty] = useState<ClassDifficulty | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<Method | null>(null)
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
  const existingClassBookFetcher = useFetcher<BookDetail>()

  const subjects = subjectsFetcher.data ?? []
  const methods = methodsFetcher.data ?? []
  const books = booksFetcher.data ?? []
  const bookDetail = bookDetailFetcher.data ?? null
  const existingClassBook = existingClassBookFetcher.data ?? null
  const showCreateClassForm = !hasExistingClasses || classSelectionMode === "create"
  const selectedExistingClass = selectedExistingClassId
    ? existingClasses.find((item) => item.id === selectedExistingClassId) ?? null
    : null
  const selectedSubjectName = selectedSubject?.name ?? ""
  const shouldHaveSubjects = classSetupConfirmed
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
    const yearOk =
      !selectedYear ||
      (book.school_years ?? []).length === 0 ||
      (book.school_years ?? []).includes(selectedYear) ||
      (book.school_years ?? []).includes("Unknown")
    const levelOk =
      !selectedLevel ||
      (book.levels ?? []).length === 0 ||
      (book.levels ?? []).includes(selectedLevel) ||
      (book.levels ?? []).includes("Unknown")
    return yearOk && levelOk
  })

  const classSetupValid =
    selectedLevel !== null &&
    selectedYear !== null &&
    lessonDuration !== null &&
    lessonDuration > 0 &&
    classSize !== null &&
    classSize > 0 &&
    classDifficulty !== null

  const curriculumValid =
    selectedSubject !== null &&
    selectedMethod !== null &&
    selectedBook !== null

  const contentValid =
    lessonCount !== null &&
    lessonCount > 0 &&
    selectedParagraphIds.length > 0

  const step = !classSetupConfirmed ? 1 : !curriculumConfirmed ? 2 : 3

  useEffect(() => {
    const saved = loadPlanState()
    if (!saved) {
      if (!hasExistingClasses) setClassSelectionMode("create")
      setDraftHydrated(true)
      return
    }

    setClassSelectionMode(!hasExistingClasses ? "create" : saved.classSelectionMode)

    const savedExistingClassId = saved.selectedExistingClassId
    if (savedExistingClassId && existingClasses.some((item) => item.id === savedExistingClassId)) {
      setSelectedExistingClassId(savedExistingClassId)
      const matchingClass = existingClasses.find((item) => item.id === savedExistingClassId)
      setExistingClassPrefillBookId(matchingClass?.latestLesplanBookId ?? null)
    } else {
      setSelectedExistingClassId(null)
      setExistingClassPrefillBookId(null)
    }

    setSelectedLevel(saved.selectedLevel)
    setSelectedYear(saved.selectedYear)
    setSelectedCategory(saved.selectedCategory)
    setSelectedSubject(saved.selectedSubject)
    setClassSetupConfirmed(saved.classSetupConfirmed)
    setCurriculumConfirmed(saved.curriculumConfirmed)
    setLessonCount(saved.lessonCount)
    setLessonDuration(saved.lessonDuration)
    setClassSize(saved.classSize)
    setClassDifficulty(saved.classDifficulty)
    setSelectedMethod(saved.selectedMethod)
    setSelectedBook(saved.selectedBook)
    setSelectedParagraphIds(saved.selectedParagraphIds)
    setShowSummary(saved.showSummary)
    setDraftHydrated(true)
  }, [existingClasses, hasExistingClasses])

  useEffect(() => {
    if (!selectedExistingClassId) return
    if (existingClasses.some((item) => item.id === selectedExistingClassId)) return
    setSelectedExistingClassId(null)
    setExistingClassPrefillBookId(null)
  }, [selectedExistingClassId, existingClasses])

  useEffect(() => {
    if (!classSetupConfirmed) return
    if (subjectsFetcher.data !== undefined || subjectsFetcher.state !== "idle") return
    subjectsFetcher.load("/api/subjects")
  }, [classSetupConfirmed, subjectsFetcher.data, subjectsFetcher.state])

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
    if (!selectedExistingClassId || !classSetupConfirmed || subjects.length === 0 || selectedSubject) return

    const prefillBookData =
      existingClassBook &&
      existingClassPrefillBookId &&
      existingClassBook.id === existingClassPrefillBookId
        ? existingClassBook
        : null

    const subjectFromBook = prefillBookData?.subject_id
      ? subjects.find((subject) => subject.id === prefillBookData.subject_id)
      : null
    const subjectFromClass = selectedExistingClass
      ? subjects.find((subject) => subject.name === selectedExistingClass.subject)
      : null

    const prefilledSubject = subjectFromBook ?? subjectFromClass
    if (!prefilledSubject) return

    handleSubjectSelect(prefilledSubject)
  }, [
    selectedExistingClassId,
    classSetupConfirmed,
    subjects,
    selectedSubject,
    selectedExistingClass,
    existingClassBook,
    existingClassPrefillBookId,
  ])

  useEffect(() => {
    const methodId =
      existingClassBook &&
      existingClassPrefillBookId &&
      existingClassBook.id === existingClassPrefillBookId
        ? existingClassBook.method_id
        : null
    if (!selectedExistingClassId || !methodId || methods.length === 0) return
    if (selectedMethod !== null) return

    const prefilledMethod = methods.find((method) => method.id === methodId)
    if (!prefilledMethod) return

    handleMethodSelect(prefilledMethod)
  }, [selectedExistingClassId, existingClassBook, existingClassPrefillBookId, methods, selectedMethod])

  useEffect(() => {
    const prefillBookId = existingClassPrefillBookId
    if (!selectedExistingClassId || !selectedMethod || !prefillBookId || filteredBooks.length === 0) return
    if (selectedBook !== null) return

    const prefilledBook = filteredBooks.find((book) => book.id === prefillBookId)
    if (!prefilledBook) return

    handleBookSelect(prefilledBook)
  }, [selectedExistingClassId, existingClassPrefillBookId, selectedMethod, filteredBooks, selectedBook])

  useEffect(() => {
    if (subjects.length === 0) return

    const categories = Array.from(new Set(subjects.map((subject) => normalizeSubjectCategory(subject.category))))
      .sort((a, b) => a.localeCompare(b, "nl"))

    if (selectedSubject) {
      const subjectCategory = normalizeSubjectCategory(selectedSubject.category)
      if (categories.includes(subjectCategory) && selectedCategory !== subjectCategory) {
        setSelectedCategory(subjectCategory)
        return
      }
    }

    if (!selectedCategory || !categories.includes(selectedCategory)) {
      setSelectedCategory(categories[0] ?? null)
    }
  }, [subjects, selectedSubject, selectedCategory])

  useEffect(() => {
    if (!classSetupValid && classSetupConfirmed) {
      setClassSetupConfirmed(false)
    }
  }, [classSetupValid, classSetupConfirmed])

  useEffect(() => {
    if (!curriculumValid && curriculumConfirmed) {
      setCurriculumConfirmed(false)
    }
  }, [curriculumValid, curriculumConfirmed])

  useEffect(() => {
    if (showSummary && !contentValid) {
      setShowSummary(false)
    }
  }, [showSummary, contentValid])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!draftHydrated) return

    const draft: SavedPlanState = {
      classSelectionMode,
      selectedExistingClassId,
      selectedLevel,
      selectedYear,
      selectedCategory,
      selectedSubject,
      lessonCount,
      lessonDuration,
      classSize,
      classDifficulty,
      classSetupConfirmed,
      curriculumConfirmed,
      selectedMethod,
      selectedBook,
      selectedParagraphIds,
      showSummary,
    }

    window.localStorage.setItem(PLAN_STATE_KEY, JSON.stringify(draft))
  }, [
    classSelectionMode,
    selectedExistingClassId,
    selectedLevel,
    selectedYear,
    selectedCategory,
    selectedSubject,
    lessonCount,
    lessonDuration,
    classSize,
    classDifficulty,
    classSetupConfirmed,
    curriculumConfirmed,
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
    setSelectedExistingClassId(null)
    setExistingClassPrefillBookId(null)
    setClassSelectionMode("create")
    setSelectedLevel(level)
    setClassSetupConfirmed(false)
    setCurriculumConfirmed(false)
    setShowSummary(false)

    if (selectedYear && getDisabledYears(level).includes(selectedYear)) {
      setSelectedYear(null)
    }

    setSelectedBook(null)
    setSelectedParagraphIds([])
    setOpenChapters([])
    setComboQuery("")
    setComboOpen(false)
  }

  function handleYearSelect(year: SchoolYear) {
    setSelectedExistingClassId(null)
    setExistingClassPrefillBookId(null)
    setClassSelectionMode("create")
    setSelectedYear(year)
    setClassSetupConfirmed(false)
    setCurriculumConfirmed(false)
    setShowSummary(false)
    setSelectedBook(null)
    setSelectedParagraphIds([])
    setOpenChapters([])
    setComboQuery("")
    setComboOpen(false)
  }

  function handleCreateNewClass() {
    setSelectedExistingClassId(null)
    setExistingClassPrefillBookId(null)
    setClassSelectionMode("create")
    setClassSetupConfirmed(false)
    setCurriculumConfirmed(false)
    setSelectedCategory(null)
    setSelectedSubject(null)
    setSelectedMethod(null)
    setSelectedBook(null)
    setSelectedParagraphIds([])
    setOpenChapters([])
    setComboQuery("")
    setComboOpen(false)
    setShowSummary(false)
  }

  function handleExistingClassSelect(classId: string) {
    const existingClass = existingClasses.find((item) => item.id === classId)
    if (!existingClass) return

    setSelectedExistingClassId(existingClass.id)
    setExistingClassPrefillBookId(existingClass.latestLesplanBookId)
    setClassSelectionMode("choose")
    setSelectedLevel(existingClass.level)
    setSelectedYear(existingClass.schoolYear)
    setClassSize(existingClass.size)
    setClassDifficulty(existingClass.difficulty ?? "Groen")
    setLessonDuration(existingClass.latestLesplanLessonDuration ?? 50)
    setLessonCount(existingClass.latestLesplanNumLessons ?? null)

    setClassSetupConfirmed(true)
    setCurriculumConfirmed(false)
    setSelectedCategory(null)
    setSelectedSubject(null)
    setSelectedMethod(null)
    setSelectedBook(null)
    setSelectedParagraphIds([])
    setOpenChapters([])
    setComboQuery("")
    setComboOpen(false)
    setShowSummary(false)

    if (existingClass.latestLesplanBookId) {
      existingClassBookFetcher.load(`/api/book/${existingClass.latestLesplanBookId}`)
    }
  }

  function handleBack() {
    if (showSummary) {
      setShowSummary(false)
      return
    }

    if (step === 3) {
      setCurriculumConfirmed(false)
      setShowSummary(false)
    } else if (step === 2) {
      setClassSetupConfirmed(false)
      setCurriculumConfirmed(false)
      if (selectedExistingClassId) {
        setSelectedExistingClassId(null)
        setExistingClassPrefillBookId(null)
        setClassSelectionMode(hasExistingClasses ? "choose" : "create")
        setSelectedCategory(null)
        setSelectedSubject(null)
        setSelectedMethod(null)
        setSelectedBook(null)
      }
    } else if (step === 1) {
      setSelectedExistingClassId(null)
      setExistingClassPrefillBookId(null)
      setClassSelectionMode(hasExistingClasses ? "choose" : "create")
      setSelectedSubject(null)
      setSelectedLevel(null)
      setSelectedYear(null)
      setClassSetupConfirmed(false)
      setCurriculumConfirmed(false)
      setShowSummary(false)
    }
  }

  function handleCategorySelect(category: string) {
    setSelectedCategory(category)

    if (normalizeSubjectCategory(selectedSubject?.category) === category) {
      return
    }

    setSelectedSubject(null)
    setSelectedMethod(null)
    setSelectedBook(null)
    setCurriculumConfirmed(false)
    setSelectedParagraphIds([])
    setOpenChapters([])
    setComboQuery("")
    setComboOpen(false)
    setShowSummary(false)
  }

  function handleSubjectSelect(subject: Subject) {
    setSelectedCategory(normalizeSubjectCategory(subject.category))
    setSelectedSubject(subject)
    setSelectedMethod(null)
    setSelectedBook(null)
    setCurriculumConfirmed(false)
    setSelectedParagraphIds([])
    setOpenChapters([])
    setComboQuery("")
    setComboOpen(false)
    setShowSummary(false)

    const params = new URLSearchParams({ subject_id: subject.id, subject_name: subject.name })
    methodsFetcher.load(`/api/methods?${params.toString()}`)
  }

  function handleMethodSelect(method: Method) {
    setSelectedMethod(method)
    setSelectedBook(null)
    setCurriculumConfirmed(false)
    setSelectedParagraphIds([])
    setOpenChapters([])
    setComboQuery("")
    setComboOpen(false)
    setShowSummary(false)

    const params = new URLSearchParams()
    if (method.id) params.set("method_id", method.id)
    if (selectedSubject?.id) params.set("subject_id", selectedSubject.id)
    booksFetcher.load(`/api/books?${params.toString()}`)
  }

  function handleBookSelect(book: Book) {
    setSelectedBook(book)
    setCurriculumConfirmed(false)
    setOpenChapters([])
    setSelectedParagraphIds([])
    setComboQuery("")
    setComboOpen(false)
    setShowSummary(false)
    if (book.id) bookDetailFetcher.load(`/api/book/${book.id}`)
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
        selectedExistingClassId,
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
            prefetch="intent"
            className="flex items-center gap-2 text-sm font-bold text-black/60 hover:text-black transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Lessen
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
          existingClasses={existingClasses}
          showCreateForm={showCreateClassForm}
          selectedLevel={selectedLevel}
          selectedYear={selectedYear}
          classSize={classSize}
          lessonDuration={lessonDuration}
          classDifficulty={classDifficulty}
          onCreateNew={handleCreateNewClass}
          onExistingClassSelect={handleExistingClassSelect}
          onLevelSelect={handleLevelSelect}
          onYearSelect={handleYearSelect}
          onClassSizeChange={setClassSize}
          onLessonDurationChange={setLessonDuration}
          onClassDifficultyChange={setClassDifficulty}
          onConfirm={() => setClassSetupConfirmed(true)}
          canContinue={classSetupValid}
        />
      )}

      {step === 2 && selectedLevel && selectedYear && (
        <Step2Subject
          selectedLevel={selectedLevel}
          selectedYear={selectedYear}
          selectedCategory={selectedCategory}
          selectedSubject={selectedSubject}
          selectedMethod={selectedMethod}
          selectedBook={selectedBook}
          subjects={subjects}
          subjectsLoading={subjectsLoading}
          methods={methods}
          methodsLoading={methodsLoading}
          filteredBooks={filteredBooks}
          booksLoading={booksLoading}
          onCategorySelect={handleCategorySelect}
          onSubjectSelect={handleSubjectSelect}
          onMethodSelect={handleMethodSelect}
          onBookSelect={handleBookSelect}
          onConfirm={() => setCurriculumConfirmed(true)}
          canContinue={curriculumValid}
        />
      )}

      {step === 3 && selectedBook && !showSummary && (
        <Step6Paragraphs
          selectedSubjectName={selectedSubjectName}
          selectedBook={selectedBook}
          lessonCount={lessonCount}
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
          onLessonCountChange={setLessonCount}
          onContinueToSummary={() => setShowSummary(true)}
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
