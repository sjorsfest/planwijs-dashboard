import { useState } from "react"
import { useFetcher } from "react-router"
import { X, Check, Plus } from "lucide-react"
import { motion } from "framer-motion"
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
  SUBTLE_LAYOUT_TRANSITION,
} from "../../routes/app.classes/constants"
import { ClassDocumentPicker } from "./ClassDocumentPicker"

interface CreateClassCardProps {
  availableLevels: Level[]
  isCreating: boolean
  onToggle: () => void
  onCreated: () => void
}

export function CreateClassCard({
  availableLevels,
  isCreating,
  onToggle,
  onCreated,
}: CreateClassCardProps) {
  const fetcher = useFetcher()
  const isSubmitting = fetcher.state !== "idle"

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
    setName("")
    setClassNotes("")
    setLinkedFiles([])
    onCreated()
  }

  if (!isCreating) {
    return (
      <button
        onClick={onToggle}
        className="rounded-2xl border-2 border-dashed border-[#d4daf0] bg-[#f8f9ff] hover:border-[#2a14b4]/30 hover:bg-[#eff4ff] transition-all flex flex-col items-center justify-center gap-2 py-10 cursor-pointer group"
      >
        <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
          <Plus className="w-4.5 h-4.5 text-[#5c5378] group-hover:text-[#2a14b4] transition-colors" />
        </div>
        <span className="text-sm font-medium text-[#5c5378] group-hover:text-[#2a14b4] transition-colors">
          Nieuwe klas
        </span>
      </button>
    )
  }

  return (
    <motion.div
      layout
      transition={{ layout: SUBTLE_LAYOUT_TRANSITION }}
      className="bg-white rounded-2xl shadow-[0px_24px_40px_rgba(11,28,48,0.07)] overflow-hidden"
    >
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-[#0b1c30]">Nieuwe klas</p>
          <button
            onClick={onToggle}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5c5378] hover:bg-[#eff4ff] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

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

        <div className="grid grid-cols-2 gap-3">
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

        <ClassDocumentPicker
          classId={null}
          linkedFiles={linkedFiles}
          onLinkedFilesChange={setLinkedFiles}
        />

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
            onClick={onToggle}
            disabled={isSubmitting}
            className="text-sm"
          >
            Annuleren
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
