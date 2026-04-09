import { AnimatePresence, motion } from "framer-motion"
import {
  GraduationCap,
  BookMarked,
  ListChecks,
  Layers,
  Users,
  Clock,
  Activity,
  DoorOpen,
  Grid2x2,
  Library,
  BookOpen,
  Hash,
  FileText,
} from "lucide-react"
import { Button } from "~/components/ui/button"

type StepIntroContent = {
  icon: React.ReactNode
  title: string
  description: string
  fields: { icon: React.ReactNode; label: string; explanation: string }[]
  buttonLabel: string
}

const STEP_CONTENT: Record<1 | 2 | 3, StepIntroContent> = {
  1: {
    icon: <GraduationCap />,
    title: "Stap 1: Klasgegevens",
    description:
      "We beginnen met wat informatie over je klas. Hoe beter we je situatie kennen, hoe gerichter het lesplan wordt.",
    fields: [
      {
        icon: <Layers className="w-3.5 h-3.5" />,
        label: "Niveau & schooljaar",
        explanation:
          "Bepaalt welke boeken en methodes beschikbaar zijn, en op welk cognitief niveau de lesstof wordt aangeboden.",
      },
      {
        icon: <Users className="w-3.5 h-3.5" />,
        label: "Aantal leerlingen",
        explanation:
          "Bepaalt welke werkvormen we voorstellen — individueel werk, groepsopdrachten of klassikale instructie.",
      },
      {
        icon: <Clock className="w-3.5 h-3.5" />,
        label: "Lesduur",
        explanation:
          "Bepaalt hoeveel activiteiten er in een les passen en hoe gedetailleerd de planning wordt.",
      },
      {
        icon: <Activity className="w-3.5 h-3.5" />,
        label: "Klasdynamiek",
        explanation:
          "Past het tempo en de werkvormen aan. Een klas met meer begeleiding krijgt kortere opdrachten en meer structuur.",
      },
      {
        icon: <DoorOpen className="w-3.5 h-3.5" />,
        label: "Lokaal",
        explanation:
          "Optioneel: geef aan in welk lokaal je lesgeeft en welke middelen er beschikbaar zijn (digibord, laptops, etc.). We houden hier rekening mee bij het kiezen van werkvormen.",
      },
    ],
    buttonLabel: "Aan de slag",
  },
  2: {
    icon: <BookMarked />,
    title: "Stap 2: Vak & methode",
    description:
      "Nu kiezen we het vakmateriaal. Selecteer stap voor stap je vak, methode en boek.",
    fields: [
      {
        icon: <Grid2x2 className="w-3.5 h-3.5" />,
        label: "Categorie & vak",
        explanation:
          "Kies het vak waarvoor je een lesplan wilt maken. De vakken zijn gegroepeerd per categorie.",
      },
      {
        icon: <Library className="w-3.5 h-3.5" />,
        label: "Methode",
        explanation:
          "De lesmethode die jullie school gebruikt (bijv. Getal & Ruimte, Stepping Stones). We gebruiken de opbouw ervan om je lesplan te structureren.",
      },
      {
        icon: <BookOpen className="w-3.5 h-3.5" />,
        label: "Boek",
        explanation:
          "Het specifieke boek binnen de methode. We filteren automatisch op jouw niveau en schooljaar. Hieruit selecteer je straks de paragrafen.",
      },
    ],
    buttonLabel: "Begrepen",
  },
  3: {
    icon: <ListChecks />,
    title: "Stap 3: Inhoud & planning",
    description:
      "Dit is de laatste stap! Geef aan welke stof je wilt behandelen en in hoeveel lessen.",
    fields: [
      {
        icon: <Hash className="w-3.5 h-3.5" />,
        label: "Aantal lessen",
        explanation:
          "Hoeveel lessen wil je besteden aan de geselecteerde stof? Meer lessen betekent meer verdieping per paragraaf, minder lessen een hoger tempo.",
      },
      {
        icon: <FileText className="w-3.5 h-3.5" />,
        label: "Paragrafen",
        explanation:
          "Selecteer de paragrafen die je wilt behandelen. Je kunt hele hoofdstukken aanvinken of individuele paragrafen kiezen.",
      },
    ],
    buttonLabel: "Laten we beginnen",
  },
}

interface Props {
  step: 1 | 2 | 3
  onDismiss: () => void
}

export function StepIntroOverlay({ step, onDismiss }: Props) {
  const content = STEP_CONTENT[step]

  return (
    <AnimatePresence>
      <motion.div
        key={`step-intro-${step}-backdrop`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md max-h-[calc(100dvh-2rem)] bg-white rounded-2xl shadow-[0px_24px_40px_rgba(11,28,48,0.07)] overflow-y-auto"
        >
          {/* Content */}
          <div className="px-5 pb-5 pt-5 sm:px-7 sm:pb-7 sm:pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2a14b4] to-[#4338ca] flex items-center justify-center shadow-[0px_4px_12px_rgba(42,20,180,0.2)] flex-shrink-0">
                <div className="[&>svg]:w-[18px] [&>svg]:h-[18px] text-white">{content.icon}</div>
              </div>
              <h1 className="text-lg font-bold text-[#0b1c30] tracking-[-0.01em] font-[family-name:var(--font-heading)]">
                {content.title}
              </h1>
            </div>
            <p className="text-sm text-[#464554] leading-relaxed">
              {content.description}
            </p>

            <div className="mt-4 space-y-1.5">
              {content.fields.map((field) => (
                <div
                  key={field.label}
                  className="rounded-lg bg-[#f8f9ff] px-3.5 py-2.5 flex gap-2.5"
                >
                  <span className="text-[#5c5378] mt-px flex-shrink-0">{field.icon}</span>
                  <div>
                    <p className="text-[13px] font-semibold text-[#0b1c30] leading-snug">{field.label}</p>
                    <p className="text-[12px] text-[#464554]/80 leading-relaxed mt-0.5">{field.explanation}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <Button onClick={onDismiss} className="w-full">
                {content.buttonLabel}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
