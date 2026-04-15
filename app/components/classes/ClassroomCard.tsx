import { useState } from "react"
import { useFetcher } from "react-router"
import {
  Pencil,
  Trash2,
  X,
  Check,
  MapPin,
  Plus,
  Loader2,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { Classroom } from "~/lib/backend/types"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"
import {
  SOFT_EASE,
  SUBTLE_EASE,
  SUBTLE_LAYOUT_TRANSITION,
  PRESET_ASSETS,
} from "../../routes/app.classes/constants"

// ── Classroom Card ──────────────────────────────────────────

interface ClassroomCardProps {
  classroom: Classroom
  isEditing: boolean
  isDeleting: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
  onCancelDelete: () => void
  onSaved: () => void
}

export function ClassroomCard({
  classroom,
  isEditing,
  isDeleting,
  onEdit,
  onCancelEdit,
  onDelete,
  onCancelDelete,
  onSaved,
}: ClassroomCardProps) {
  const fetcher = useFetcher()
  const isDeleteSubmitting = fetcher.state !== "idle" && fetcher.formData?.get("_action") === "deleteClassroom"

  function handleDelete() {
    const formData = new FormData()
    formData.set("_action", "deleteClassroom")
    formData.set("classroomId", classroom.id!)
    fetcher.submit(formData, { method: "POST" })
    onCancelDelete()
  }

  return (
    <motion.div
      layout
      transition={{ layout: SUBTLE_LAYOUT_TRANSITION }}
      className={cn(
        "bg-white rounded-2xl shadow-[0px_24px_40px_rgba(11,28,48,0.07)] overflow-hidden relative",
        isDeleteSubmitting && "pointer-events-none"
      )}
    >
      {isDeleteSubmitting && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 rounded-2xl">
          <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
        </div>
      )}
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0d7377] to-[#14919b] flex items-center justify-center flex-shrink-0 shadow-[0px_4px_10px_rgba(13,115,119,0.25)]">
              <MapPin className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#0b1c30] truncate">{classroom.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onEdit}
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                isEditing
                  ? "bg-[#0d7377]/10 text-[#0d7377]"
                  : "text-[#5c5378] hover:bg-[#eff4ff]"
              )}
            >
              {isEditing ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
            </button>
            <button
              onClick={isDeleting ? handleDelete : onDelete}
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                isDeleting
                  ? "bg-red-50 text-red-600"
                  : "text-[#5c5378] hover:bg-[#eff4ff]"
              )}
            >
              {isDeleting ? <Check className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
            </button>
            {isDeleting && (
              <button
                onClick={onCancelDelete}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5c5378] hover:bg-[#eff4ff] transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {isDeleting && (
          <p className="text-xs text-red-600 font-medium mb-3">
            Klik op ✓ om dit lokaal te verwijderen
          </p>
        )}

        {/* Assets */}
        {(classroom.assets ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {(classroom.assets ?? []).map((asset) => (
              <span
                key={asset}
                className="inline-flex items-center px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#e6f7f7] text-[#0d7377]"
              >
                {asset}
              </span>
            ))}
          </div>
        )}

        {(classroom.assets ?? []).length === 0 && !isEditing && (
          <p className="text-xs text-[#8a91a5]">Geen middelen opgegeven</p>
        )}
      </div>

      {/* Edit mode */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.5, ease: SUBTLE_EASE },
              opacity: { duration: 0.28, ease: SOFT_EASE },
            }}
            className="overflow-hidden"
          >
            <div className="border-t border-[#eff4ff]">
              <ClassroomEditForm
                classroom={classroom}
                onSaved={onSaved}
                onCancel={onCancelEdit}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Classroom Edit Form ─────────────────────────────────────

function ClassroomEditForm({
  classroom,
  onSaved,
  onCancel,
}: {
  classroom: Classroom
  onSaved: () => void
  onCancel: () => void
}) {
  const fetcher = useFetcher()
  const isSubmitting = fetcher.state !== "idle"

  const [name, setName] = useState(classroom.name)
  const [assets, setAssets] = useState<string[]>(classroom.assets ?? [])
  const [customAsset, setCustomAsset] = useState("")
  const [showPresets, setShowPresets] = useState(false)

  const availablePresets = PRESET_ASSETS.filter((p) => !assets.includes(p))

  function addAsset(asset: string) {
    const trimmed = asset.trim()
    if (trimmed && !assets.includes(trimmed)) {
      setAssets((prev) => [...prev, trimmed])
    }
  }

  function removeAsset(asset: string) {
    setAssets((prev) => prev.filter((a) => a !== asset))
  }

  function handleCustomAssetKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      if (customAsset.trim()) {
        addAsset(customAsset)
        setCustomAsset("")
      }
    }
    if (e.key === "Backspace" && customAsset === "" && assets.length > 0) {
      setAssets((prev) => prev.slice(0, -1))
    }
  }

  function handleSave() {
    if (!name.trim()) return

    const body = {
      name: name.trim(),
      assets,
    }

    const formData = new FormData()
    formData.set("_action", "updateClassroom")
    formData.set("classroomId", classroom.id!)
    formData.set("body", JSON.stringify(body))
    fetcher.submit(formData, { method: "POST" })
    onSaved()
  }

  return (
    <div className="p-5 space-y-4">
      <label className="block">
        <span className="block text-xs font-medium text-[#464554] mb-1.5">Naam lokaal</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="bijv. Lokaal 204, Science Lab"
          className="w-full h-10 rounded-xl bg-[#dce9ff] px-3 text-sm font-semibold text-[#0b1c30] outline-none focus:ring-2 focus:ring-[#2a14b4]/35 placeholder:font-normal placeholder:text-[#8a91a5]"
        />
      </label>

      <div>
        <span className="block text-xs font-medium text-[#464554] mb-1.5">
          Beschikbare middelen
        </span>

        <div
          className="min-h-[44px] rounded-xl bg-[#dce9ff] px-3 py-2 flex flex-wrap gap-1.5 items-center cursor-text focus-within:ring-2 focus-within:ring-[#2a14b4]/35"
          onClick={() => document.getElementById(`asset-input-${classroom.id}`)?.focus()}
        >
          {assets.map((asset) => (
            <span
              key={asset}
              className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 text-xs font-semibold rounded-lg bg-[#2a14b4] text-white shadow-[0px_2px_6px_rgba(42,20,180,0.25)]"
            >
              {asset}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeAsset(asset)
                }}
                className="ml-0.5 p-0.5 rounded-md hover:bg-white/20 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input
            id={`asset-input-${classroom.id}`}
            type="text"
            value={customAsset}
            onChange={(e) => setCustomAsset(e.target.value)}
            onKeyDown={handleCustomAssetKeyDown}
            onFocus={() => setShowPresets(true)}
            onBlur={() => setTimeout(() => setShowPresets(false), 200)}
            placeholder={assets.length === 0 ? "Typ of kies middelen..." : ""}
            className="flex-1 min-w-[120px] bg-transparent text-sm font-medium text-[#0b1c30] outline-none placeholder:font-normal placeholder:text-[#8a91a5]"
          />
        </div>

        {showPresets && availablePresets.length > 0 && (
          <div className="mt-2 rounded-xl bg-[#f8f9ff] p-2 shadow-[0px_12px_24px_rgba(11,28,48,0.1)]">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8a91a5] px-2 pb-1.5">
              Suggesties
            </p>
            <div className="flex flex-wrap gap-1.5">
              {availablePresets
                .filter(
                  (p) =>
                    !customAsset.trim() ||
                    p.toLowerCase().includes(customAsset.toLowerCase())
                )
                .map((preset) => (
                  <button
                    key={preset}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      addAsset(preset)
                      setCustomAsset("")
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#eff4ff] text-[#0b1c30] hover:bg-[#dce9ff] transition-all"
                  >
                    <Plus className="w-3 h-3 text-[#2a14b4]" />
                    {preset}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button
          onClick={handleSave}
          disabled={isSubmitting || !name.trim()}
          className="gap-1.5 text-sm"
        >
          <Check className="w-4 h-4" />
          Opslaan
        </Button>
        <Button
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
          className="text-sm"
        >
          Annuleren
        </Button>
      </div>
    </div>
  )
}
