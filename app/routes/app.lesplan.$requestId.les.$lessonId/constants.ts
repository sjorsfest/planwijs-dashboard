export const LESSON_TABS = [
  { id: "overzicht", label: "Overzicht" },
  { id: "tijdschema", label: "Tijdschema" },
  { id: "notities", label: "Notities" },
  { id: "taken", label: "Taken" },
] as const

export type LessonTabId = (typeof LESSON_TABS)[number]["id"]

export const LESSON_SECTION_KEY_TO_FIELD_NAME: Record<string, string> = {
  title: "title",
  leerdoelen: "learning_objectives",
  tijdschema: "time_sections",
  docentnotities: "teacher_notes",
  benodigdheden: "required_materials",
}

export function lessonSectionKeyToFieldName(sectionKey: string): string {
  return LESSON_SECTION_KEY_TO_FIELD_NAME[sectionKey] ?? sectionKey
}

export const activityTypeStyles: Record<string, string> = {
  introduction: "bg-blue-50 text-blue-700",
  instruction: "bg-[#ffdf9f]/60 text-[#4c3700]",
  activity: "bg-emerald-50 text-emerald-700",
  closure: "bg-[#eff4ff] text-[#2a14b4]",
  repetition: "bg-orange-50 text-orange-700",
}
