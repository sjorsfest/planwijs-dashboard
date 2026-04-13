import { FILE_TYPE_LABELS } from "./constants"

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getFileTypeLabel(contentType: string): string {
  return FILE_TYPE_LABELS[contentType] ?? "Bestand"
}

export function getFileIcon(contentType: string): "pdf" | "word" | "powerpoint" | "excel" | "image" | "text" | "file" {
  if (contentType === "application/pdf") return "pdf"
  if (contentType.includes("word") || contentType.includes("wordprocessingml")) return "word"
  if (contentType.includes("powerpoint") || contentType.includes("presentationml")) return "powerpoint"
  if (contentType.includes("excel") || contentType.includes("spreadsheetml")) return "excel"
  if (contentType.startsWith("image/")) return "image"
  if (contentType === "text/plain") return "text"
  return "file"
}

const dateFormatter = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

export function formatDate(dateString: string): string {
  return dateFormatter.format(new Date(dateString))
}
