import { useNavigation } from "react-router"
import { useEffect, useRef, useState } from "react"

export function NavigationProgress() {
  const navigation = useNavigation()
  const isNavigating = navigation.state !== "idle"
  const [visible, setVisible] = useState(false)
  const [width, setWidth] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (isNavigating) {
      clearTimeout(timerRef.current)
      setVisible(true)
      setWidth(0)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setWidth(75)
        })
      })
    } else {
      setWidth(100)
      timerRef.current = setTimeout(() => {
        setVisible(false)
        setWidth(0)
      }, 300)
    }
    return () => clearTimeout(timerRef.current)
  }, [isNavigating])

  if (!visible) return null

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        height: "3px",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          height: "100%",
          background: "linear-gradient(90deg, #2a14b4, #4338ca)",
          width: `${width}%`,
          transition:
            width === 100
              ? "width 0.2s ease"
              : "width 2s cubic-bezier(0.05, 0.5, 0.1, 1)",
          boxShadow: "2px 0 8px rgba(42, 20, 180, 0.4)",
        }}
      />
    </div>
  )
}
