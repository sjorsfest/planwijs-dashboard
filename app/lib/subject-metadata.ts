import type { LucideIcon } from "lucide-react"
import {
  Atom,
  BookHeart,
  BookOpen,
  FlaskConical,
  Globe2,
  Landmark,
  Languages,
  Leaf,
  ScrollText,
  Sigma,
  UsersRound,
} from "lucide-react"

export const SUBJECT_NAMES = [
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
] as const

export const SUBJECT_VALUES = new Set<string>(SUBJECT_NAMES)

export const SUBJECT_ICON_BY_NAME: Record<(typeof SUBJECT_NAMES)[number], LucideIcon> = {
  Aardrijkskunde: Globe2,
  Bedrijfseconomie: Landmark,
  Biologie: Leaf,
  Duits: Languages,
  Economie: Landmark,
  Engels: Languages,
  Frans: Languages,
  Geschiedenis: ScrollText,
  Grieks: Languages,
  Latijn: Languages,
  "Levens beschouwing": BookHeart,
  Maatschappijleer: UsersRound,
  MAW: UsersRound,
  "Mens & Maatschappij": UsersRound,
  "Nask/Science": Atom,
  Natuurkunde: Atom,
  Nederlands: Languages,
  Scheikunde: FlaskConical,
  Spaans: Languages,
  Wiskunde: Sigma,
  "Wiskunde A": Sigma,
  "Wiskunde B": Sigma,
  Unknown: BookOpen,
}

const DEFAULT_SUBJECT_ICON = BookOpen

function normalizeSubjectName(subjectName: string): string {
  return subjectName
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " en ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

const SUBJECT_ICON_BY_NORMALIZED_NAME: Record<string, LucideIcon> = {
  ...(Object.fromEntries(
    Object.entries(SUBJECT_ICON_BY_NAME).map(([subjectName, icon]) => [normalizeSubjectName(subjectName), icon])
  ) as Record<string, LucideIcon>),
  [normalizeSubjectName("Levensbeschouwing")]: BookHeart,
  [normalizeSubjectName("Maatschappij")]: UsersRound,
}

export function getSubjectIcon(subjectName?: string | null): LucideIcon {
  if (!subjectName) return DEFAULT_SUBJECT_ICON
  return SUBJECT_ICON_BY_NORMALIZED_NAME[normalizeSubjectName(subjectName)] ?? DEFAULT_SUBJECT_ICON
}
