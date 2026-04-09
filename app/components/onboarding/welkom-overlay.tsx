import { useNavigate } from "react-router"
import { AnimatePresence, motion } from "framer-motion"
import { Sparkles } from "lucide-react"
import { Button } from "~/components/ui/button"
import { useOnboarding } from "./onboarding-context"

export function WelkomOverlay() {
  const { phase, hydrated, advance, dismiss } = useOnboarding()
  const navigate = useNavigate()

  if (!hydrated || phase !== "welkom") return null

  function handleStart() {
    advance()
    navigate("/lesplan/new")
  }

  return (
    <AnimatePresence>
      <motion.div
        key="welkom-backdrop"
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
          className="w-full max-w-md bg-white rounded-2xl shadow-[0px_24px_40px_rgba(11,28,48,0.07)] overflow-hidden"
        >
          {/* Decorative header */}
          <div className="flex justify-center pt-10 pb-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#f9bd22] to-[#ffdf9f] flex items-center justify-center shadow-[0px_8px_20px_rgba(249,189,34,0.3)]">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="px-8 pb-8 pt-4 text-center">
            <h1 className="text-2xl font-bold text-[#0b1c30] tracking-[-0.02em] font-[family-name:var(--font-heading)]">
              Welkom bij Planwijs!
            </h1>
            <p className="mt-3 text-[#464554] leading-relaxed">
              Maak in een paar stappen je eerste lesplan. Kies je klas, vak en
              methode — wij doen de rest.
            </p>

            <div className="mt-8 flex flex-col gap-3">
              <Button size="lg" onClick={handleStart} className="w-full">
                Maak je eerste lesplan
              </Button>
              <button
                type="button"
                onClick={dismiss}
                className="text-sm text-[#464554] hover:text-[#2a14b4] transition-colors cursor-pointer"
              >
                Ik kijk eerst even rond
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
