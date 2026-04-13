import {
  SUPPORT_CHALLENGE_OPTIONS,
  type ClassDifficulty,
  type ClassSupportChallenge,
} from "~/components/new-plan/types"

export const DIFFICULTY_OPTIONS: { value: ClassDifficulty; label: string; description: string }[] = [
  { value: "Groen", label: "Groen", description: "Goed hanteerbaar" },
  { value: "Oranje", label: "Oranje", description: "Vraagt extra aandacht" },
  { value: "Rood", label: "Rood", description: "Intensieve begeleiding nodig" },
]

export const SUPPORT_CHALLENGE_DESCRIPTIONS: Record<ClassSupportChallenge, string> = {
  "Meer ondersteuning": "Extra scaffolding en begeleiding",
  "Gebalanceerd": "Standaard aanpak",
  "Meer uitdaging": "Complexere taken, meer zelfstandigheid",
}

export const SUPPORT_OPTIONS: { value: ClassSupportChallenge; description: string }[] = [
  ...SUPPORT_CHALLENGE_OPTIONS.map((value) => ({
    value,
    description: SUPPORT_CHALLENGE_DESCRIPTIONS[value],
  })),
]

export const AI_IMPACT_ITEMS = [
  { field: "Niveau", description: "Bepaalt de taalcomplexiteit en het abstractieniveau van de les" },
  { field: "Schooljaar", description: "Jonger = meer structuur en modelling, ouder = meer zelfstandigheid" },
  { field: "Klasgrootte", description: "Beïnvloedt suggesties voor groepswerk en activiteiten" },
  { field: "Klasdynamiek", description: "Hoeveelheid scaffolding: Rood = kleine stappen, Groen = standaard" },
  { field: "Aandachtsspanne", description: "Bepaalt het lestempo en wanneer activiteitswisselingen nodig zijn" },
  { field: "Klasnotities", description: "Vrije context die de AI meeweegt bij het genereren" },
]

export type FieldHintKey =
  | "level"
  | "schoolYear"
  | "size"
  | "attentionSpan"
  | "difficulty"
  | "classNotes"

export interface FieldHintContent {
  impact: string
  options: string[]
}

export const FIELD_HINTS: Record<FieldHintKey, FieldHintContent> = {
  level: {
    impact: "Niveau stuurt vooral taalcomplexiteit, abstractieniveau en het soort voorbeelden dat de AI kiest.",
    options: ["Vmbo-b/k/g/t", "Havo", "Vwo", "Gymnasium"],
  },
  schoolYear: {
    impact: "Schooljaar bepaalt hoeveel structuur versus zelfstandigheid de AI in werkvormen en instructie inbouwt.",
    options: ["1e t/m 6e jaar", "Hogere jaren worden beperkt op basis van gekozen niveau"],
  },
  size: {
    impact: "Klasgrootte beïnvloedt groepsindeling, tempo van klassikale momenten en haalbaarheid van differentiatie.",
    options: ["Numerieke waarde (minimaal 1 leerling)", "Hoger aantal => meer nadruk op schaalbare werkvormen"],
  },
  attentionSpan: {
    impact: "Aandachtsspanne helpt de AI bepalen hoe lang activiteiten duren en hoe vaak er gewisseld moet worden.",
    options: ["Optioneel veld", "Getal in minuten (minimaal 1)"],
  },
  difficulty: {
    impact:
      "Klasdynamiek is de primaire begeleidingsschaal: dit veld beïnvloedt hoe stapsgewijs en check-gericht de lesopbouw wordt, inclusief fallback-hints.",
    options: [
      "Groen: hanteerbaar; AI-output mag relaxter zijn, zonder sterke geforceerde vereenvoudiging of extra uitdaging.",
      "Oranje: duidelijke nudge naar meer begeleiding en extra checkmomenten.",
      "Rood: sterkste ondersteuningssignaal; fallback-hints worden expliciet stap-voor-stap en check-heavy.",
    ],
  },
  classNotes: {
    impact: "Klasnotities geven vrije context die de AI gebruikt om inhoud en werkvormen specifieker te maken.",
    options: ["Vrije tekst (optioneel)", "Bijv. gedrag, tempo, niveauverschillen of didactische aandachtspunten"],
  },
}

export const SOFT_EASE = [0.22, 1, 0.36, 1] as const
export const SUBTLE_EASE = [0.22, 0.64, 0.29, 0.99] as const
export const SUBTLE_LAYOUT_TRANSITION = { duration: 0.5, ease: SUBTLE_EASE } as const

export const SUBJECTS = [
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
] as const

export const PRESET_ASSETS = [
  "Digibord",
  "Whiteboard",
  "Beamer",
  "Laptops / Chromebooks",
  "Telefoons (Kahoot e.d.)",
  "Groepstafels",
  "Geluidsinstallatie",
  "Printer",
]
