import { useEffect, useState } from "react"
import { useActionData, useFetcher, useLoaderData, useNavigation, useSubmit } from "react-router"
import { ArrowLeft } from "lucide-react"
import { useOnboarding } from "~/components/onboarding/onboarding-context"
import { StepIntroOverlay } from "~/components/onboarding/step-intro-overlay"
import type { Book, BookDetail, Classroom, Subject } from "~/lib/backend/types"
import { Step1ClassSetup } from "~/components/new-plan/step1-class-setup"
import { ClassroomPicker, type PendingClassroom } from "~/components/new-plan/classroom-picker"
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
import type { ActionData, SavedPlanState } from "./types"
import type { loader, action } from "./route"
import { PLAN_STATE_KEY } from "./constants"
import { normalizeSubjectCategory, loadPlanState } from "./utils"

export default function NewLesplanPage() {
  const { existingClasses, classrooms: initialClassrooms } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>() as ActionData | undefined
  const navigation = useNavigation()
  const submit = useSubmit()

  const { phase, isStepCompleted, markStepCompleted } = useOnboarding()
  const isOnboarding = phase === "voltooid"
  const hasExistingClasses = existingClasses.length > 0
  const [classSelectionMode, setClassSelectionMode] = useState<"choose" | "create">(
    hasExistingClasses ? "choose" : "create"
  )
  const [selectedExistingClassId, setSelectedExistingClassId] = useState<string | null>(null)
  const [existingClassPrefillBookId, setExistingClassPrefillBookId] = useState<string | null>(null)
  const [classrooms, setClassrooms] = useState<Classroom[]>(initialClassrooms)
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null)
  const [pendingClassroom, setPendingClassroom] = useState<PendingClassroom>(null)
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
  const [className_, setClassName] = useState("")
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
    (selectedExistingClassId !== null || className_.trim().length > 0) &&
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

    setSelectedClassroomId(saved.selectedClassroomId)
    setClassName(saved.className_)
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
      selectedClassroomId,
      className_,
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
    selectedClassroomId,
    className_,
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
      setSelectedCategory(null)
      setSelectedSubject(null)
      setSelectedMethod(null)
      setSelectedBook(null)
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

  async function handleConfirmStep1() {
    if (pendingClassroom) {
      try {
        const res = await fetch("/api/classrooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: pendingClassroom.name, assets: pendingClassroom.assets }),
        })
        if (res.ok) {
          const created: Classroom = await res.json()
          setClassrooms((prev) => [...prev, created])
          setSelectedClassroomId(created.id ?? null)
          setPendingClassroom(null)
        }
      } catch {
        // Classroom creation failed — continue without it
      }
    }
    setClassSetupConfirmed(true)
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
        selectedClassroomId,
        className_,
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
      {step === 1 && (
        <Step1ClassSetup
          existingClasses={existingClasses}
          showCreateForm={showCreateClassForm}
          selectedExistingClassId={selectedExistingClassId}
          className_={className_}
          selectedLevel={selectedLevel}
          selectedYear={selectedYear}
          classSize={classSize}
          lessonDuration={lessonDuration}
          classDifficulty={classDifficulty}
          onCreateNew={handleCreateNewClass}
          onExistingClassSelect={handleExistingClassSelect}
          onDeselectExistingClass={() => {
            setSelectedExistingClassId(null)
            setExistingClassPrefillBookId(null)
            setClassSelectionMode(hasExistingClasses ? "choose" : "create")
          }}
          onClassNameChange={setClassName}
          onLevelSelect={handleLevelSelect}
          onYearSelect={handleYearSelect}
          onClassSizeChange={setClassSize}
          onLessonDurationChange={setLessonDuration}
          onClassDifficultyChange={setClassDifficulty}
          onConfirm={handleConfirmStep1}
          canContinue={classSetupValid}
          classroomPicker={
            <ClassroomPicker
              classrooms={classrooms}
              classroomsLoading={false}
              selectedClassroomId={selectedClassroomId}
              onSelect={setSelectedClassroomId}
              onPendingChange={setPendingClassroom}
            />
          }
        />
      )}

      {step === 2 && selectedLevel && selectedYear && (
        <Step2Subject
          backLink={
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-sm font-bold text-black/60 hover:text-black transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Terug
            </button>
          }
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
          backLink={
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-sm font-bold text-black/60 hover:text-black transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Terug
            </button>
          }
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
          className_={selectedExistingClass?.name ?? className_}
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

      {isOnboarding && !showSummary && !isStepCompleted(step) && (
        <StepIntroOverlay
          step={step as 1 | 2 | 3}
          onDismiss={() => markStepCompleted(step)}
        />
      )}
    </div>
  )
}
