import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  FileText,
  Upload,
  Trash2,
  Download,
  FileSpreadsheet,
  FileImage,
  FileType,
  Presentation,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  Home,
  Pencil,
  Check,
} from "lucide-react"
import { useFetcher, useLoaderData, useRevalidator } from "react-router"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "~/components/ui/button"
import type { loader } from "./route"
import type { FileRecord, Folder } from "./types"
import { ACCEPTED_EXTENSIONS, MAX_FILE_SIZE } from "./constants"
import { formatFileSize, getFileIcon, getFileTypeLabel, formatDate } from "./utils"

// ─── Types ────────────────────────────────────────────────────────────────

type UploadingFile = {
  id: string
  file: File
  progress: "requesting-url" | "uploading" | "confirming" | "done" | "error"
  error?: string
}

type BreadcrumbItem = { id: string; name: string }

type DragPayload = { type: "folder" | "file"; id: string }

const DRAG_MIME = "application/x-leslab-drag"

// ─── Helpers ──────────────────────────────────────────────────────────────

function findFolderInTree(folders: Folder[], id: string): Folder | null {
  for (const folder of folders) {
    if (folder.id === id) return folder
    const found = findFolderInTree(folder.children, id)
    if (found) return found
  }
  return null
}

function isDescendant(folders: Folder[], parentId: string, candidateChildId: string): boolean {
  const parent = findFolderInTree(folders, parentId)
  if (!parent) return false
  function check(children: Folder[]): boolean {
    for (const child of children) {
      if (child.id === candidateChildId) return true
      if (check(child.children)) return true
    }
    return false
  }
  return check(parent.children)
}

function buildBreadcrumbs(folders: Folder[], targetId: string): BreadcrumbItem[] {
  function search(items: Folder[], path: BreadcrumbItem[]): BreadcrumbItem[] | null {
    for (const folder of items) {
      const currentPath = [...path, { id: folder.id, name: folder.name }]
      if (folder.id === targetId) return currentPath
      const found = search(folder.children, currentPath)
      if (found) return found
    }
    return null
  }
  return search(folders, []) ?? []
}

function getDragPayload(e: React.DragEvent): DragPayload | null {
  try {
    const raw = e.dataTransfer.getData(DRAG_MIME)
    if (!raw) return null
    return JSON.parse(raw) as DragPayload
  } catch {
    return null
  }
}

function isInternalDrag(e: React.DragEvent): boolean {
  return e.dataTransfer.types.includes(DRAG_MIME)
}

// ─── Sub-components ───────────────────────────────────────────────────────

function FileIconComponent({ contentType }: { contentType: string }) {
  const type = getFileIcon(contentType)
  const shared = "w-5 h-5"
  switch (type) {
    case "pdf":
      return <FileText className={`${shared} text-red-500`} />
    case "word":
      return <FileType className={`${shared} text-blue-600`} />
    case "powerpoint":
      return <Presentation className={`${shared} text-orange-500`} />
    case "excel":
      return <FileSpreadsheet className={`${shared} text-green-600`} />
    case "image":
      return <FileImage className={`${shared} text-purple-500`} />
    default:
      return <FileText className={`${shared} text-[#5c5378]`} />
  }
}

function FolderRow({
  folder,
  index,
  onOpen,
  onRename,
  onDelete,
  onDropItem,
  isReceiving,
}: {
  folder: Folder
  index: number
  onOpen: (folder: Folder) => void
  onRename: (folderId: string, name: string) => void
  onDelete: (folderId: string) => void
  onDropItem: (payload: DragPayload, targetFolderId: string) => void
  isReceiving: boolean
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(folder.name)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDropTarget, setIsDropTarget] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragCountRef = useRef(0)

  useEffect(() => {
    if (isEditing) inputRef.current?.select()
  }, [isEditing])

  const fileCount = folder.files.length
  const folderCount = folder.children.length
  const itemParts: string[] = []
  if (folderCount > 0) itemParts.push(`${folderCount} map${folderCount !== 1 ? "pen" : ""}`)
  if (fileCount > 0) itemParts.push(`${fileCount} bestand${fileCount !== 1 ? "en" : ""}`)
  const subtitle = itemParts.length > 0 ? itemParts.join(", ") : "Leeg"

  const handleRenameSubmit = () => {
    const trimmed = editName.trim()
    if (trimmed && trimmed !== folder.name) {
      onRename(folder.id, trimmed)
    }
    setIsEditing(false)
  }

  const handleDragStart = (e: React.DragEvent) => {
    const payload: DragPayload = { type: "folder", id: folder.id }
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload))
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragEnter = (e: React.DragEvent) => {
    if (!isInternalDrag(e)) return
    e.preventDefault()
    dragCountRef.current++
    setIsDropTarget(true)
  }

  const handleDragLeave = () => {
    dragCountRef.current--
    if (dragCountRef.current <= 0) {
      dragCountRef.current = 0
      setIsDropTarget(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    if (!isInternalDrag(e)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCountRef.current = 0
    setIsDropTarget(false)
    const payload = getDragPayload(e)
    if (!payload) return
    // Don't drop a folder on itself
    if (payload.type === "folder" && payload.id === folder.id) return
    onDropItem(payload, folder.id)
  }

  return (
    <div
      draggable={!isEditing}
      onDragStart={handleDragStart}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{ cursor: isEditing ? "default" : "grab" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        className={[
          "group rounded-2xl transition-all",
          isDropTarget
            ? "ring-2 ring-[#2a14b4] bg-[#2a14b4]/5 scale-[1.01]"
            : [
                "hover:shadow-[0px_24px_40px_rgba(11,28,48,0.09)] hover:-translate-y-px",
                index % 2 === 0 ? "bg-white" : "bg-[#eff4ff]",
              ].join(" "),
        ].join(" ")}
      >
        <div className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
          {/* Folder icon */}
          <button
            type="button"
            onClick={() => onOpen(folder)}
            className="w-10 h-10 rounded-xl bg-[#2a14b4]/5 border border-[#2a14b4]/10 flex items-center justify-center flex-shrink-0 hover:bg-[#2a14b4]/10 transition-colors"
          >
            {isReceiving ? (
              <Loader2 className="w-5 h-5 text-[#2a14b4] animate-spin" />
            ) : (
              <FolderOpen className="w-5 h-5 text-[#2a14b4]" />
            )}
          </button>

          {/* Name / info */}
          <button
            type="button"
            onClick={() => !isEditing && onOpen(folder)}
            className="flex-1 min-w-0 text-left"
          >
            {isEditing ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleRenameSubmit()
                }}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleRenameSubmit}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setEditName(folder.name)
                      setIsEditing(false)
                    }
                  }}
                  className="text-sm sm:text-base font-semibold text-[#0b1c30] bg-transparent border-b-2 border-[#2a14b4] outline-none py-0.5 w-full"
                />
                <button
                  type="submit"
                  className="p-1 rounded-lg hover:bg-[#eff4ff] transition-colors flex-shrink-0"
                >
                  <Check className="w-4 h-4 text-[#2a14b4]" />
                </button>
              </form>
            ) : (
              <>
                <p className="text-sm sm:text-base font-semibold text-[#0b1c30] truncate">
                  {folder.name}
                </p>
                <p className="text-xs text-[#464554] mt-0.5">{subtitle}</p>
              </>
            )}
          </button>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setEditName(folder.name)
                setIsEditing(true)
              }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[#5c5378] hover:bg-[#2a14b4]/5 hover:text-[#2a14b4] transition-all opacity-0 group-hover:opacity-100"
              title="Hernoemen"
            >
              <Pencil className="w-4 h-4" />
            </button>

            {showDeleteConfirm ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(folder.id)
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                >
                  Verwijder
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowDeleteConfirm(false)
                  }}
                  className="p-1.5 rounded-lg hover:bg-[#eff4ff] transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-[#5c5378]" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowDeleteConfirm(true)
                }}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-[#5c5378] hover:bg-red-50 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                title="Verwijderen"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <ChevronRight className="w-4 h-4 text-[#5c5378]/40 group-hover:text-[#2a14b4] transition-colors ml-1" />
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function FileRow({
  file,
  index,
  onDelete,
  deleteConfirmId,
  onDeleteConfirm,
  isDeleting,
}: {
  file: FileRecord
  index: number
  onDelete: (fileId: string) => void
  deleteConfirmId: string | null
  onDeleteConfirm: (id: string | null) => void
  isDeleting: boolean
}) {
  const handleDragStart = (e: React.DragEvent) => {
    const payload: DragPayload = { type: "file", id: file.id }
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload))
    e.dataTransfer.effectAllowed = "move"
  }

  return (
    <div draggable onDragStart={handleDragStart} style={{ cursor: "grab" }}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        className={[
          "group rounded-2xl transition-all hover:shadow-[0px_24px_40px_rgba(11,28,48,0.09)] hover:-translate-y-px",
          index % 2 === 0 ? "bg-white" : "bg-[#eff4ff]",
        ].join(" ")}
      >
        <div className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#f8f9ff] border border-[#e8eeff] flex items-center justify-center flex-shrink-0">
            <FileIconComponent contentType={file.content_type} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm sm:text-base font-semibold text-[#0b1c30] truncate">
              {file.name}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#464554] mt-0.5">
              <span>{getFileTypeLabel(file.content_type)}</span>
              <span className="text-[#c7c4d7]">·</span>
              <span>{formatFileSize(file.size_bytes)}</span>
              <span className="text-[#c7c4d7] hidden sm:inline">·</span>
              <span className="hidden sm:inline">{formatDate(file.created_at)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[#5c5378] hover:bg-[#2a14b4]/5 hover:text-[#2a14b4] transition-all"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </a>

            {deleteConfirmId === file.id ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onDelete(file.id)}
                  disabled={isDeleting}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  Verwijder
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteConfirm(null)}
                  className="p-1.5 rounded-lg hover:bg-[#eff4ff] transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-[#5c5378]" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onDeleteConfirm(file.id)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-[#5c5378] hover:bg-red-50 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                title="Verwijderen"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Breadcrumb drop target ───────────────────────────────────────────────

function BreadcrumbDropTarget({
  children,
  onDrop,
  className,
}: {
  children: React.ReactNode
  onDrop: (payload: DragPayload) => void
  className: string
}) {
  const [isOver, setIsOver] = useState(false)
  const countRef = useRef(0)

  return (
    <span
      onDragEnter={(e) => {
        if (!isInternalDrag(e)) return
        e.preventDefault()
        countRef.current++
        setIsOver(true)
      }}
      onDragLeave={() => {
        countRef.current--
        if (countRef.current <= 0) {
          countRef.current = 0
          setIsOver(false)
        }
      }}
      onDragOver={(e) => {
        if (!isInternalDrag(e)) return
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
      }}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        countRef.current = 0
        setIsOver(false)
        const payload = getDragPayload(e)
        if (payload) onDrop(payload)
      }}
      className={[
        className,
        isOver ? "ring-2 ring-[#2a14b4] bg-[#2a14b4]/10 scale-105" : "",
      ].join(" ")}
    >
      {children}
    </span>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const { folders, rootFiles } = useLoaderData<typeof loader>()
  const revalidator = useRevalidator()
  const fetcher = useFetcher()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState<UploadingFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [pendingFolderName, setPendingFolderName] = useState<string | null>(null)
  const [receivingFolderId, setReceivingFolderId] = useState<string | null>(null)
  const newFolderInputRef = useRef<HTMLInputElement>(null)

  const isBusy = fetcher.state !== "idle"
  const isCreatingPending = isBusy && pendingFolderName !== null

  // Clear pending states when fetcher completes
  useEffect(() => {
    if (!isBusy) {
      setPendingFolderName(null)
      setReceivingFolderId(null)
    }
  }, [isBusy])

  // Derive current view from the folder tree
  const breadcrumbs = useMemo<BreadcrumbItem[]>(
    () => (currentFolderId ? buildBreadcrumbs(folders, currentFolderId) : []),
    [folders, currentFolderId],
  )

  const currentFolder = useMemo(
    () => (currentFolderId ? findFolderInTree(folders, currentFolderId) : null),
    [folders, currentFolderId],
  )

  // If current folder was deleted or no longer exists, go back to root
  useEffect(() => {
    if (currentFolderId && !currentFolder) setCurrentFolderId(null)
  }, [currentFolderId, currentFolder])

  const visibleFolders = currentFolder ? currentFolder.children : folders
  const visibleFiles = currentFolder ? currentFolder.files : rootFiles

  useEffect(() => {
    if (isCreatingFolder) newFolderInputRef.current?.focus()
  }, [isCreatingFolder])

  // ─── Upload logic ─────────────────────────────────────────────────────

  const uploadFile = useCallback(
    async (file: File) => {
      const id = crypto.randomUUID()

      if (file.size > MAX_FILE_SIZE) {
        setUploading((prev) => [
          ...prev,
          { id, file, progress: "error", error: "Bestand is te groot (max 50 MB)" },
        ])
        return
      }

      setUploading((prev) => [...prev, { id, file, progress: "requesting-url" }])

      try {
        const urlRes = await fetch("/api/files/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            content_type: file.type || "application/octet-stream",
            size_bytes: file.size,
            folder_id: currentFolderId,
          }),
        })

        if (!urlRes.ok) throw new Error("Kon upload-URL niet ophalen")

        const { file_id, upload_url, upload_method, upload_headers } = await urlRes.json()

        setUploading((prev) =>
          prev.map((u) => (u.id === id ? { ...u, progress: "uploading" } : u)),
        )

        const uploadRes = await fetch(upload_url, {
          method: upload_method,
          headers: upload_headers,
          body: file,
        })

        if (!uploadRes.ok) {
          await fetch(`/api/files/${file_id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ intent: "upload-failed" }),
          })
          throw new Error("Upload mislukt")
        }

        setUploading((prev) =>
          prev.map((u) => (u.id === id ? { ...u, progress: "confirming" } : u)),
        )

        const confirmRes = await fetch(`/api/files/${file_id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intent: "confirm-upload" }),
        })

        if (!confirmRes.ok) throw new Error("Bevestiging mislukt")

        setUploading((prev) =>
          prev.map((u) => (u.id === id ? { ...u, progress: "done" } : u)),
        )

        revalidator.revalidate()

        setTimeout(() => {
          setUploading((prev) => prev.filter((u) => u.id !== id))
        }, 2000)
      } catch (err) {
        setUploading((prev) =>
          prev.map((u) =>
            u.id === id
              ? { ...u, progress: "error", error: err instanceof Error ? err.message : "Onbekende fout" }
              : u,
          ),
        )
      }
    },
    [revalidator, currentFolderId],
  )

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return
      Array.from(fileList).forEach(uploadFile)
    },
    [uploadFile],
  )

  const handleUploadDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      // Ignore internal drag-and-drop (folder/file reorganization)
      if (isInternalDrag(e)) return
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles],
  )

  // ─── Actions ──────────────────────────────────────────────────────────

  const handleDeleteFile = (fileId: string) => {
    fetcher.submit({ intent: "delete-file", fileId }, { method: "post" })
    setDeleteConfirm(null)
  }

  const handleCreateFolder = () => {
    const trimmed = newFolderName.trim()
    if (!trimmed) return
    setPendingFolderName(trimmed)
    fetcher.submit(
      { intent: "create-folder", name: trimmed, parentId: currentFolderId ?? "" },
      { method: "post" },
    )
    setNewFolderName("")
    setIsCreatingFolder(false)
  }

  const handleRenameFolder = (folderId: string, name: string) => {
    fetcher.submit({ intent: "rename-folder", folderId, name }, { method: "post" })
  }

  const handleDeleteFolder = (folderId: string) => {
    fetcher.submit({ intent: "delete-folder", folderId }, { method: "post" })
  }

  const handleDropOnFolder = useCallback(
    (payload: DragPayload, targetFolderId: string) => {
      if (payload.type === "file") {
        setReceivingFolderId(targetFolderId)
        fetcher.submit(
          { intent: "move-file", fileId: payload.id, folderId: targetFolderId },
          { method: "post" },
        )
      } else if (payload.type === "folder") {
        // Prevent moving a folder into itself or its own descendant
        if (payload.id === targetFolderId) return
        if (isDescendant(folders, payload.id, targetFolderId)) return
        setReceivingFolderId(targetFolderId)
        fetcher.submit(
          { intent: "move-folder", folderId: payload.id, parentId: targetFolderId },
          { method: "post" },
        )
      }
    },
    [fetcher, folders],
  )

  const handleDropOnBreadcrumb = useCallback(
    (payload: DragPayload, targetFolderId: string | null) => {
      if (payload.type === "file") {
        if (targetFolderId) setReceivingFolderId(targetFolderId)
        fetcher.submit(
          { intent: "move-file", fileId: payload.id, folderId: targetFolderId ?? "" },
          { method: "post" },
        )
      } else if (payload.type === "folder") {
        if (payload.id === targetFolderId) return
        if (targetFolderId && isDescendant(folders, payload.id, targetFolderId)) return
        if (targetFolderId) setReceivingFolderId(targetFolderId)
        fetcher.submit(
          { intent: "move-folder", folderId: payload.id, parentId: targetFolderId ?? "" },
          { method: "post" },
        )
      }
    },
    [fetcher, folders],
  )

  // ─── Render ───────────────────────────────────────────────────────────

  const isEmpty = visibleFolders.length === 0 && visibleFiles.length === 0 && uploading.length === 0 && !isCreatingPending
  const isRoot = currentFolderId === null

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6 lg:mb-10">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1.5 text-[#0b1c30]">
            Documenten
          </h1>
          <p className="text-[#464554] text-sm">
            Upload en beheer je lesmateriaal: werkbladen, presentaties, toetsen en meer.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => setIsCreatingFolder(true)}
            className="gap-2 flex-1 sm:flex-initial"
          >
            <FolderPlus className="w-4 h-4" />
            Nieuwe map
          </Button>
          <Button
            onClick={() => inputRef.current?.click()}
            className="gap-2 flex-1 sm:flex-initial"
          >
            <Upload className="w-4 h-4" />
            Upload
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ACCEPTED_EXTENSIONS}
          multiple
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ""
          }}
        />
      </div>

      {/* Breadcrumbs */}
      {!isRoot && (
        <nav className="flex items-center gap-1 mb-4 text-sm flex-wrap">
          <BreadcrumbDropTarget
            onDrop={(p) => handleDropOnBreadcrumb(p, null)}
            className="rounded-lg transition-all"
          >
            <button
              type="button"
              onClick={() => setCurrentFolderId(null)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[#5c5378] hover:bg-[#eff4ff] hover:text-[#2a14b4] transition-colors font-medium"
            >
              <Home className="w-3.5 h-3.5" />
              Documenten
            </button>
          </BreadcrumbDropTarget>
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.id} className="flex items-center gap-1">
              <ChevronRight className="w-3.5 h-3.5 text-[#c7c4d7]" />
              {i === breadcrumbs.length - 1 ? (
                <BreadcrumbDropTarget
                  onDrop={(p) => handleDropOnBreadcrumb(p, crumb.id)}
                  className="rounded-lg transition-all"
                >
                  <span className="px-2 py-1 font-semibold text-[#0b1c30]">{crumb.name}</span>
                </BreadcrumbDropTarget>
              ) : (
                <BreadcrumbDropTarget
                  onDrop={(p) => handleDropOnBreadcrumb(p, crumb.id)}
                  className="rounded-lg transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setCurrentFolderId(crumb.id)}
                    className="px-2 py-1 rounded-lg text-[#5c5378] hover:bg-[#eff4ff] hover:text-[#2a14b4] transition-colors font-medium"
                  >
                    {crumb.name}
                  </button>
                </BreadcrumbDropTarget>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Drop zone for file uploads */}
      <div
        onDragOver={(e) => {
          // Only show upload drop zone for external file drags
          if (isInternalDrag(e)) return
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleUploadDrop}
        className={[
          "relative rounded-2xl border-2 border-dashed transition-all mb-6",
          isDragging
            ? "border-[#2a14b4] bg-[#2a14b4]/5 scale-[1.01]"
            : "border-[#c7c4d7] bg-white hover:border-[#5c5378] hover:bg-[#f8f9ff]",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full p-6 sm:p-8 flex flex-col items-center gap-2.5 cursor-pointer"
        >
          <div
            className={[
              "w-11 h-11 rounded-2xl flex items-center justify-center transition-colors",
              isDragging ? "bg-[#2a14b4]/10" : "bg-[#eff4ff]",
            ].join(" ")}
          >
            <Upload
              className={[
                "w-5 h-5 transition-colors",
                isDragging ? "text-[#2a14b4]" : "text-[#5c5378]",
              ].join(" ")}
            />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-[#0b1c30]">
              {isDragging ? "Laat los om te uploaden" : "Sleep bestanden hierheen"}
            </p>
            <p className="text-xs text-[#464554] mt-0.5">
              {currentFolder
                ? `Uploaden naar "${currentFolder.name}"`
                : "of klik om bestanden te selecteren"}
            </p>
          </div>
        </button>
      </div>

      {/* Upload progress */}
      <AnimatePresence>
        {uploading.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-6 space-y-2"
          >
            {uploading.map((u) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-[0px_4px_12px_rgba(11,28,48,0.06)]"
              >
                {u.progress === "done" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                ) : u.progress === "error" ? (
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                ) : (
                  <Loader2 className="w-4 h-4 text-[#2a14b4] animate-spin flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0b1c30] truncate">{u.file.name}</p>
                  <p className="text-xs text-[#464554]">
                    {u.progress === "requesting-url" && "Voorbereiden..."}
                    {u.progress === "uploading" && "Uploaden..."}
                    {u.progress === "confirming" && "Verwerken..."}
                    {u.progress === "done" && "Geüpload!"}
                    {u.progress === "error" && (u.error ?? "Er ging iets mis")}
                  </p>
                </div>
                {u.progress === "error" && (
                  <button
                    type="button"
                    onClick={() => setUploading((prev) => prev.filter((x) => x.id !== u.id))}
                    className="p-1 rounded-lg hover:bg-[#eff4ff] transition-colors"
                  >
                    <X className="w-4 h-4 text-[#5c5378]" />
                  </button>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* New folder input */}
      <AnimatePresence>
        {isCreatingFolder && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleCreateFolder()
              }}
              className="flex items-center gap-3 bg-white rounded-2xl p-4 sm:p-5 shadow-[0px_4px_12px_rgba(11,28,48,0.06)]"
            >
              <div className="w-10 h-10 rounded-xl bg-[#2a14b4]/5 border border-[#2a14b4]/10 flex items-center justify-center flex-shrink-0">
                <FolderPlus className="w-5 h-5 text-[#2a14b4]" />
              </div>
              <input
                ref={newFolderInputRef}
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsCreatingFolder(false)
                    setNewFolderName("")
                  }
                }}
                placeholder="Naam van de map..."
                className="flex-1 text-sm sm:text-base font-semibold text-[#0b1c30] bg-transparent border-b-2 border-[#2a14b4] outline-none py-0.5 placeholder:font-normal placeholder:text-[#464554]/50"
              />
              <Button type="submit" size="sm" disabled={!newFolderName.trim() || isBusy}>
                <Check className="w-4 h-4" />
              </Button>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingFolder(false)
                  setNewFolderName("")
                }}
                className="p-2 rounded-lg hover:bg-[#eff4ff] transition-colors"
              >
                <X className="w-4 h-4 text-[#5c5378]" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {isEmpty && !isCreatingFolder ? (
        <div className="bg-white rounded-2xl p-12 flex flex-col items-center gap-4 text-center shadow-[0px_24px_40px_rgba(11,28,48,0.07)]">
          <div className="w-12 h-12 rounded-2xl bg-[#eff4ff] flex items-center justify-center">
            {isRoot ? (
              <FileText className="w-6 h-6 text-[#5c5378]" />
            ) : (
              <FolderOpen className="w-6 h-6 text-[#5c5378]" />
            )}
          </div>
          <div>
            <p className="font-semibold text-base text-[#0b1c30]">
              {isRoot ? "Nog geen documenten" : "Deze map is leeg"}
            </p>
            <p className="text-sm text-[#464554] mt-1">
              {isRoot
                ? "Upload je eerste bestand of maak een map aan om je lesmateriaal te organiseren."
                : "Upload een bestand of maak een submap aan."}
            </p>
          </div>
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => setIsCreatingFolder(true)}
              className="gap-2"
            >
              <FolderPlus className="w-4 h-4" />
              Nieuwe map
            </Button>
            <Button onClick={() => inputRef.current?.click()} className="gap-2">
              <Upload className="w-4 h-4" />
              Upload bestand
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Pending folder placeholder */}
          {isCreatingPending && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-white"
            >
              <div className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#2a14b4]/5 border border-[#2a14b4]/10 flex items-center justify-center flex-shrink-0">
                  <Loader2 className="w-5 h-5 text-[#2a14b4] animate-spin" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm sm:text-base font-semibold text-[#0b1c30]/50 truncate">
                    {pendingFolderName}
                  </p>
                  <p className="text-xs text-[#464554]/50 mt-0.5">Aanmaken...</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Folders first */}
          {visibleFolders.map((folder: Folder, index: number) => (
            <FolderRow
              key={folder.id}
              folder={folder}
              index={index}
              onOpen={(f) => setCurrentFolderId(f.id)}
              onRename={handleRenameFolder}
              onDelete={handleDeleteFolder}
              onDropItem={handleDropOnFolder}
              isReceiving={receivingFolderId === folder.id}
            />
          ))}

          {/* Then files */}
          {visibleFiles.map((file: FileRecord, index: number) => (
            <FileRow
              key={file.id}
              file={file}
              index={visibleFolders.length + index}
              onDelete={handleDeleteFile}
              deleteConfirmId={deleteConfirm}
              onDeleteConfirm={setDeleteConfirm}
              isDeleting={isBusy}
            />
          ))}
        </div>
      )}
    </div>
  )
}
