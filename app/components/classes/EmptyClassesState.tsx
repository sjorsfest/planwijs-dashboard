import { useState } from "react"
import { useFetcher, Link } from "react-router"
import { Users, Check, Plus } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { FileRecord } from "~/lib/backend/types"
import { Button } from "~/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import {
  LEVELS,
  SCHOOL_YEARS,
  getDisabledYears,
  type Level,
  type SchoolYear,
} from "~/components/new-plan/types"
import {
  SOFT_EASE,
  SUBTLE_EASE,
} from "../../routes/app.classes/constants"
import { ClassDocumentPicker } from "./ClassDocumentPicker"

export function EmptyClassesState({ availableLevels }: { availableLevels: Level[] }) {
  const fetcher = useFetcher()
  const isSubmitting = fetcher.state !== "idle"
  const [showForm, setShowForm] = useState(false)

  const [name, setName] = useState("")
  const [level, setLevel] = useState<Level>(availableLevels.length > 0 ? availableLevels[0] : "Havo")
  const [schoolYear, setSchoolYear] = useState<SchoolYear>("1e jaar")
  const [size, setSize] = useState<number>(25)
  const [classNotes, setClassNotes] = useState("")
  const [linkedFiles, setLinkedFiles] = useState<FileRecord[]>([])

  const disabledYears = getDisabledYears(level)

  function handleCreate() {
    if (!name.trim()) return
    const body = {
      name: name.trim(),
      level,
      school_year: schoolYear,
      size,
      class_notes: classNotes.trim() || null,
    }
    const formData = new FormData()
    formData.set("_action", "create")
    formData.set("body", JSON.stringify(body))
    formData.set("fileIds", JSON.stringify(linkedFiles.map((f) => f.id)))
    fetcher.submit(formData, { method: "POST" })
  }

  return (
    <div className="bg-white rounded-2xl p-8 shadow-[0px_24px_40px_rgba(11,28,48,0.07)]">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#eff4ff] flex items-center justify-center">
          <Users className="w-6 h-6 text-[#5c5378]" />
        </div>
        <div>
          <p className="font-semibold text-base text-[#0b1c30]">Nog geen klassen</p>
          <p className="text-sm text-[#464554] mt-1">
            Maak een klas aan om je lesplannen op maat te laten genereren.
          </p>
        </div>

        {!showForm && (
          <div className="flex flex-col items-center gap-2 mt-2">
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Nieuwe klas aanmaken
            </Button>
            <Link
              to="/lesplan/new"
              prefetch="intent"
              className="text-xs text-[#5c5378] hover:text-[#2a14b4] transition-colors"
            >
              Of start een lesplan (klas wordt automatisch aangemaakt)
            </Link>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.4, ease: SUBTLE_EASE },
              opacity: { duration: 0.25, ease: SOFT_EASE },
            }}
            className="overflow-hidden"
          >
            <div className="mt-6 pt-6 border-t border-[#eff4ff] space-y-4 max-w-lg mx-auto">
              {/* Name */}
              <label className="block">
                <span className="block text-xs font-medium text-[#464554] mb-1.5">Klasnaam</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="bijv. 3H1, 2V-A, Klas 4"
                  className="w-full h-10 rounded-xl bg-[#dce9ff] px-3 text-sm font-semibold text-[#0b1c30] outline-none focus:ring-2 focus:ring-[#2a14b4]/35 placeholder:font-normal placeholder:text-[#8a91a5]"
                  autoFocus
                />
              </label>

              {/* Level & Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-xs font-medium text-[#464554] mb-1.5">Niveau</span>
                  <Select value={level} onValueChange={(v) => setLevel(v as Level)}>
                    <SelectTrigger className="h-10 rounded-xl border border-transparent bg-[#dce9ff] px-3 text-sm font-medium text-[#0b1c30] focus:ring-2 focus:ring-[#2a14b4]/35 focus:ring-offset-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                      className="rounded-xl border border-[#c7d6f5] bg-[#f8fbff] p-1 text-[#0b1c30] shadow-[0px_20px_32px_rgba(11,28,48,0.18)]"
                      position="popper"
                    >
                      {(availableLevels.length > 0 ? availableLevels : LEVELS).map((l) => (
                        <SelectItem
                          key={l}
                          value={l}
                          className="rounded-lg py-2 pl-8 pr-3 text-sm font-medium text-[#0b1c30] focus:bg-[#dce9ff] focus:text-[#0b1c30]"
                        >
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                <label className="block">
                  <span className="block text-xs font-medium text-[#464554] mb-1.5">Leerjaar</span>
                  <Select value={schoolYear} onValueChange={(v) => setSchoolYear(v as SchoolYear)}>
                    <SelectTrigger className="h-10 rounded-xl border border-transparent bg-[#dce9ff] px-3 text-sm font-medium text-[#0b1c30] focus:ring-2 focus:ring-[#2a14b4]/35 focus:ring-offset-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                      className="rounded-xl border border-[#c7d6f5] bg-[#f8fbff] p-1 text-[#0b1c30] shadow-[0px_20px_32px_rgba(11,28,48,0.18)]"
                      position="popper"
                    >
                      {SCHOOL_YEARS.map((y) => (
                        <SelectItem
                          key={y}
                          value={y}
                          disabled={disabledYears.includes(y)}
                          className="rounded-lg py-2 pl-8 pr-3 text-sm font-medium text-[#0b1c30] focus:bg-[#dce9ff] focus:text-[#0b1c30] data-[disabled]:text-[#8a91a5]"
                        >
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              </div>

              {/* Size */}
              <label className="block">
                <span className="block text-xs font-medium text-[#464554] mb-1.5">Aantal leerlingen</span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={size}
                  onChange={(e) => setSize(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full h-10 rounded-xl bg-[#dce9ff] px-3 text-sm font-semibold text-[#0b1c30] outline-none focus:ring-2 focus:ring-[#2a14b4]/35"
                />
              </label>

              {/* Class notes */}
              <label className="block">
                <span className="block text-xs font-medium text-[#464554] mb-1.5">Klasnotities</span>
                <textarea
                  rows={3}
                  value={classNotes}
                  onChange={(e) => setClassNotes(e.target.value)}
                  placeholder="Bijv. de klas is energiek maar gemotiveerd, veel verschil in niveau..."
                  className="w-full rounded-xl bg-[#dce9ff] px-3 py-2.5 text-sm text-[#0b1c30] outline-none focus:ring-2 focus:ring-[#2a14b4]/35 placeholder:text-[#8a91a5] resize-none"
                />
              </label>

              {/* Class documents */}
              <ClassDocumentPicker
                classId={null}
                linkedFiles={linkedFiles}
                onLinkedFilesChange={setLinkedFiles}
              />

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  onClick={handleCreate}
                  disabled={isSubmitting || !name.trim()}
                  className="gap-1.5 text-sm"
                >
                  <Check className="w-4 h-4" />
                  Klas aanmaken
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                  disabled={isSubmitting}
                  className="text-sm"
                >
                  Annuleren
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
