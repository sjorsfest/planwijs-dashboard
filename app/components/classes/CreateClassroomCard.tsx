import { useState } from "react"
import { useFetcher } from "react-router"
import { X, Check, Plus } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "~/components/ui/button"
import {
  SUBTLE_LAYOUT_TRANSITION,
  PRESET_ASSETS,
} from "../../routes/app.classes/constants"

interface CreateClassroomCardProps {
  isCreating: boolean
  onToggle: () => void
  onCreated: () => void
}

export function CreateClassroomCard({
  isCreating,
  onToggle,
  onCreated,
}: CreateClassroomCardProps) {
  const fetcher = useFetcher()
  const isSubmitting = fetcher.state !== "idle"

  const [name, setName] = useState("")
  const [assets, setAssets] = useState<string[]>([])
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

  function handleCreate() {
    if (!name.trim()) return
    const body = { name: name.trim(), assets }
    const formData = new FormData()
    formData.set("_action", "createClassroom")
    formData.set("body", JSON.stringify(body))
    fetcher.submit(formData, { method: "POST" })
    setName("")
    setAssets([])
    onCreated()
  }

  if (!isCreating) {
    return (
      <button
        onClick={onToggle}
        className="rounded-2xl border-2 border-dashed border-[#d4daf0] bg-[#f8f9ff] hover:border-[#0d7377]/30 hover:bg-[#e6f7f7]/50 transition-all flex flex-col items-center justify-center gap-2 py-10 cursor-pointer group"
      >
        <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
          <Plus className="w-4.5 h-4.5 text-[#5c5378] group-hover:text-[#0d7377] transition-colors" />
        </div>
        <span className="text-sm font-medium text-[#5c5378] group-hover:text-[#0d7377] transition-colors">
          Nieuw lokaal
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
          <p className="text-sm font-bold text-[#0b1c30]">Nieuw lokaal</p>
          <button
            onClick={onToggle}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5c5378] hover:bg-[#eff4ff] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <label className="block">
          <span className="block text-xs font-medium text-[#464554] mb-1.5">Naam lokaal</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="bijv. Lokaal 204, Science Lab"
            className="w-full h-10 rounded-xl bg-[#dce9ff] px-3 text-sm font-semibold text-[#0b1c30] outline-none focus:ring-2 focus:ring-[#2a14b4]/35 placeholder:font-normal placeholder:text-[#8a91a5]"
            autoFocus
          />
        </label>

        <div>
          <span className="block text-xs font-medium text-[#464554] mb-1.5">
            Beschikbare middelen
          </span>

          <div
            className="min-h-[44px] rounded-xl bg-[#dce9ff] px-3 py-2 flex flex-wrap gap-1.5 items-center cursor-text focus-within:ring-2 focus-within:ring-[#2a14b4]/35"
            onClick={() => document.getElementById("create-classroom-asset-input")?.focus()}
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
              id="create-classroom-asset-input"
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
            onClick={handleCreate}
            disabled={isSubmitting || !name.trim()}
            className="gap-1.5 text-sm"
          >
            <Check className="w-4 h-4" />
            Lokaal aanmaken
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
