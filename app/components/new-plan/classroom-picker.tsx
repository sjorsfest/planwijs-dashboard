import { useState, useRef, useEffect } from "react"
import { Check, MapPin, Plus, X } from "lucide-react"
import { Badge } from "~/components/ui/badge"
import { cn } from "~/lib/utils"
import type { Classroom } from "~/lib/backend/types"

const PRESET_ASSETS = [
  "Digibord",
  "Whiteboard",
  "Beamer",
  "Laptops / Chromebooks",
  "Telefoons (Kahoot e.d.)",
  "Groepstafels",
  "Geluidsinstallatie",
  "Printer",
]

export type PendingClassroom = { name: string; assets: string[] } | null

interface Props {
  classrooms: Classroom[]
  classroomsLoading: boolean
  selectedClassroomId: string | null
  onSelect: (classroomId: string | null) => void
  onPendingChange: (pending: PendingClassroom) => void
}

export function ClassroomPicker({
  classrooms,
  classroomsLoading,
  selectedClassroomId,
  onSelect,
  onPendingChange,
}: Props) {
  const [mode, setMode] = useState<"select" | "create">("select")
  const [name, setName] = useState("")
  const [assets, setAssets] = useState<string[]>([])
  const [customAsset, setCustomAsset] = useState("")
  const [showPresets, setShowPresets] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const presetsRef = useRef<HTMLDivElement>(null)

  const selectedClassroom = classrooms.find((c) => c.id === selectedClassroomId) ?? null

  // Report pending state to parent whenever create-mode fields change
  useEffect(() => {
    if (mode === "create" && name.trim()) {
      onPendingChange({ name: name.trim(), assets })
    } else {
      onPendingChange(null)
    }
  }, [mode, name, assets])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (presetsRef.current && !presetsRef.current.contains(e.target as Node)) {
        setShowPresets(false)
      }
    }
    if (showPresets) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showPresets])

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

  function handleSwitchToCreate() {
    setMode("create")
    onSelect(null)
  }

  function handleSwitchToSelect() {
    setMode("select")
    setName("")
    setAssets([])
  }

  const availablePresets = PRESET_ASSETS.filter((p) => !assets.includes(p))

  if (classroomsLoading) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-[0px_24px_40px_rgba(11,28,48,0.07)]">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-[#2a14b4]" />
          <p className="text-xs font-semibold uppercase tracking-widest text-[#464554]">Lokaal</p>
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-10 rounded-xl bg-[#eff4ff]" />
          <div className="h-10 rounded-xl bg-[#eff4ff] w-2/3" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0px_24px_40px_rgba(11,28,48,0.07)]">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-4 h-4 text-[#2a14b4]" />
        <p className="text-xs font-semibold uppercase tracking-widest text-[#464554]">Lokaal</p>
        <span className="text-[10px] text-[#5c5378]/60 ml-1">(optioneel)</span>
      </div>

      {mode === "select" ? (
        <div className="space-y-3">
          {classrooms.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {classrooms.map((classroom) => {
                const isSelected = selectedClassroomId === classroom.id
                return (
                  <button
                    key={classroom.id}
                    onClick={() => onSelect(isSelected ? null : (classroom.id ?? null))}
                    className={cn(
                      "rounded-xl px-4 py-3 text-left transition-all border group relative",
                      isSelected
                        ? "border-[#2a14b4] bg-[#eff4ff] shadow-[0px_4px_12px_rgba(42,20,180,0.12)]"
                        : "border-[#e6e8f3] bg-[#f8f9ff] hover:bg-[#eff4ff] hover:border-[#c7d6f5]"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#2a14b4] flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <p className="text-sm font-semibold text-[#0b1c30] pr-6">{classroom.name}</p>
                    {classroom.description && (
                      <p className="text-xs text-[#5c5378] mt-0.5 line-clamp-1">{classroom.description}</p>
                    )}
                    
                  </button>
                )
              })}
            </div>
          )}

          <button
            onClick={handleSwitchToCreate}
            className="flex items-center gap-2 text-sm font-semibold text-[#2a14b4] hover:text-[#1e0f80] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nieuw lokaal aanmaken
          </button>

          {selectedClassroom && (selectedClassroom.assets ?? []).length > 0 && (
            <div className="mt-3 pt-3 border-t border-[#e6e8f3]">
              <p className="text-[11px] font-medium text-[#464554] mb-2">Beschikbaar in dit lokaal:</p>
              <div className="flex flex-wrap gap-1.5">
                {(selectedClassroom.assets ?? []).map((asset) => (
                  <Badge key={asset} variant="default" className="text-[11px] px-2.5 py-1">
                    {asset}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {classrooms.length > 0 && (
            <button
              onClick={handleSwitchToSelect}
              className="text-xs font-semibold text-[#5c5378] hover:text-[#2a14b4] transition-colors"
            >
              Bestaand lokaal kiezen
            </button>
          )}

          <label className="block">
            <span className="block text-xs font-medium text-[#464554] mb-1.5">Naam lokaal</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="bijv. Lokaal 204, Science Lab, Gymlokaal"
              className="w-full h-10 rounded-xl bg-[#dce9ff] px-3 text-sm font-semibold text-[#0b1c30] outline-none focus:ring-2 focus:ring-[#2a14b4]/35 placeholder:font-normal placeholder:text-[#8a91a5]"
            />
          </label>

          <div>
            <span className="block text-xs font-medium text-[#464554] mb-1.5">
              Beschikbare middelen
            </span>

            {/* Chip input area */}
            <div
              className="min-h-[44px] rounded-xl bg-[#dce9ff] px-3 py-2 flex flex-wrap gap-1.5 items-center cursor-text focus-within:ring-2 focus-within:ring-[#2a14b4]/35"
              onClick={() => inputRef.current?.focus()}
            >
              {assets.map((asset) => (
                <span
                  key={asset}
                  className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 text-xs font-semibold rounded-lg bg-[#2a14b4] text-white shadow-[0px_2px_6px_rgba(42,20,180,0.25)] animate-in fade-in zoom-in-95 duration-150"
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
                ref={inputRef}
                type="text"
                value={customAsset}
                onChange={(e) => setCustomAsset(e.target.value)}
                onKeyDown={handleCustomAssetKeyDown}
                onFocus={() => setShowPresets(true)}
                placeholder={assets.length === 0 ? "Wat voor middelen heb je tot je beschikking in dit lokaal om lessen mee te draaien?" : ""}
                className="flex-1 min-w-[120px] bg-transparent text-sm font-medium text-[#0b1c30] outline-none placeholder:font-normal placeholder:text-[#8a91a5]"
              />
            </div>

            {/* Presets dropdown */}
            {showPresets && availablePresets.length > 0 && (
              <div
                ref={presetsRef}
                className="mt-2 rounded-xl border border-[#e6e8f3] bg-white p-2 shadow-[0px_12px_24px_rgba(11,28,48,0.1)] max-h-48 overflow-y-auto"
              >
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
                        onClick={() => {
                          addAsset(preset)
                          setCustomAsset("")
                          inputRef.current?.focus()
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[#e6e8f3] bg-[#f8f9ff] text-[#0b1c30] hover:bg-[#eff4ff] hover:border-[#c7d6f5] transition-all"
                      >
                        <Plus className="w-3 h-3 text-[#2a14b4]" />
                        {preset}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
