import { useCallback, useEffect, useRef, useState } from "react"
import {
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  FolderOpen,
  Paperclip,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { cn } from "~/lib/utils"
import type { FileRecord, Folder } from "~/lib/backend/types"

const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
]

const ACCEPTED_EXTENSIONS = ".pdf,.doc,.docx,.ppt,.pptx,.txt"

const MAX_FILE_SIZE = 50 * 1024 * 1024

const FILE_TYPE_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "application/msword": "Word",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
  "application/vnd.ms-powerpoint": "PowerPoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PowerPoint",
  "text/plain": "Tekst",
}

function getTypeLabel(contentType: string): string {
  return FILE_TYPE_LABELS[contentType] ?? "Bestand"
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isTextExtractable(contentType: string): boolean {
  return ACCEPTED_MIME_TYPES.includes(contentType)
}

function collectAllFiles(folders: Folder[]): FileRecord[] {
  const files: FileRecord[] = []
  for (const folder of folders) {
    files.push(...folder.files)
    files.push(...collectAllFiles(folder.children))
  }
  return files
}

type UploadingFile = {
  id: string
  file: File
  progress: "requesting-url" | "uploading" | "confirming" | "done" | "error"
  fileId?: string
  error?: string
}

type FilesData = {
  folders: Folder[]
  rootFiles: FileRecord[]
}

interface Props {
  selectedFileIds: string[]
  onFileIdsChange: (ids: string[]) => void
}

export function DocumentPicker({ selectedFileIds, onFileIdsChange }: Props) {
  const [expanded, setExpanded] = useState(selectedFileIds.length > 0)
  const [showBrowser, setShowBrowser] = useState(false)
  const [folders, setFolders] = useState<Folder[]>([])
  const [rootFiles, setRootFiles] = useState<FileRecord[]>([])
  const [allFiles, setAllFiles] = useState<FileRecord[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [filesLoaded, setFilesLoaded] = useState(false)
  const [uploading, setUploading] = useState<UploadingFile[]>([])
  const [openFolders, setOpenFolders] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!expanded || filesLoaded || filesLoading) return
    setFilesLoading(true)
    fetch("/api/file-list")
      .then((res) => (res.ok ? res.json() : { folders: [], rootFiles: [] }))
      .then((data: FilesData) => {
        setFolders(data.folders)
        const filteredRoot = data.rootFiles.filter(
          (f) => f.status === "UPLOADED" && isTextExtractable(f.content_type),
        )
        setRootFiles(filteredRoot)

        const folderFiles = collectAllFiles(data.folders).filter(
          (f) => f.status === "UPLOADED" && isTextExtractable(f.content_type),
        )
        setAllFiles([...filteredRoot, ...folderFiles])
        setFilesLoaded(true)
      })
      .catch(() => {
        setFolders([])
        setRootFiles([])
        setAllFiles([])
      })
      .finally(() => setFilesLoading(false))
  }, [expanded, filesLoaded, filesLoading])

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

      if (!isTextExtractable(file.type || "")) {
        setUploading((prev) => [
          ...prev,
          { id, file, progress: "error", error: "Dit bestandstype wordt niet ondersteund" },
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
          }),
        })

        if (!urlRes.ok) throw new Error("Kon upload-URL niet ophalen")

        const { file_id, upload_url, upload_method, upload_headers } = await urlRes.json()

        setUploading((prev) =>
          prev.map((u) => (u.id === id ? { ...u, progress: "uploading", fileId: file_id } : u)),
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

        const confirmed: FileRecord = await confirmRes.json()

        setUploading((prev) =>
          prev.map((u) => (u.id === id ? { ...u, progress: "done", fileId: file_id } : u)),
        )

        setAllFiles((prev) => [...prev, confirmed])
        setRootFiles((prev) => [...prev, confirmed])
        onFileIdsChange([...selectedFileIds, file_id])

        setTimeout(() => {
          setUploading((prev) => prev.filter((u) => u.id !== id))
        }, 2000)
      } catch (err) {
        setUploading((prev) =>
          prev.map((u) =>
            u.id === id
              ? { ...u, progress: "error", error: err instanceof Error ? err.message : "Upload mislukt" }
              : u,
          ),
        )
      }
    },
    [selectedFileIds, onFileIdsChange],
  )

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach(uploadFile)
    e.target.value = ""
  }

  function toggleFileSelection(fileId: string) {
    if (selectedFileIds.includes(fileId)) {
      onFileIdsChange(selectedFileIds.filter((id) => id !== fileId))
    } else {
      onFileIdsChange([...selectedFileIds, fileId])
    }
  }

  function removeFile(fileId: string) {
    onFileIdsChange(selectedFileIds.filter((id) => id !== fileId))
  }

  function toggleFolder(folderId: string) {
    setOpenFolders((prev) =>
      prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId],
    )
  }

  const selectedFiles = allFiles.filter((f) => selectedFileIds.includes(f.id))
  const hasAnyBrowsableFiles =
    rootFiles.some((f) => !selectedFileIds.includes(f.id)) ||
    folders.some((folder) => folderHasExtractableFiles(folder, selectedFileIds))

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-[#464554]/70 hover:text-[#464554] transition-colors group"
      >
        <Paperclip className="w-3.5 h-3.5" />
        <span>Documenten toevoegen</span>
        {selectedFileIds.length > 0 && (
          <span className="text-[10px] font-semibold bg-[#2a14b4]/10 text-[#2a14b4] px-2 py-0.5 rounded-full">
            {selectedFileIds.length}
          </span>
        )}
        <span className="text-[11px] text-[#464554]/40 font-normal">optioneel</span>
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform ml-auto", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-[#464554]/60 leading-relaxed">
            Voeg documenten toe die de AI kan gebruiken bij het maken van je lesplan.
            De tekst uit deze bestanden wordt geanalyseerd - alleen PDF, Word, PowerPoint en tekstbestanden.
          </p>

          {/* Selected files */}
          {selectedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedFiles.map((file) => (
                <span
                  key={file.id}
                  className="inline-flex items-center gap-1.5 bg-[#dce9ff] text-[#0b1c30] text-xs font-medium pl-2.5 pr-1.5 py-1.5 rounded-lg"
                >
                  <FileText className="w-3 h-3 text-[#2a14b4]/60 flex-shrink-0" />
                  <span className="truncate max-w-[180px]">{file.name}</span>
                  <span className="text-[10px] text-[#464554]/50 flex-shrink-0">{getTypeLabel(file.content_type)}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(file.id)}
                    className="p-0.5 rounded hover:bg-[#0b1c30]/10 transition-colors flex-shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Upload progress */}
          {uploading.length > 0 && (
            <div className="space-y-1.5">
              {uploading.map((u) => (
                <div key={u.id} className="flex items-center gap-2 text-xs">
                  {u.progress === "done" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  ) : u.progress === "error" ? (
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                  ) : (
                    <Loader2 className="w-3.5 h-3.5 text-[#2a14b4] animate-spin flex-shrink-0" />
                  )}
                  <span className="truncate text-[#464554]">{u.file.name}</span>
                  {u.error && <span className="text-red-500 flex-shrink-0">{u.error}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs font-medium text-[#2a14b4] hover:text-[#1f1080] bg-[#eff4ff] hover:bg-[#dce9ff] px-3 py-2 rounded-lg transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload nieuw
            </button>

            {(hasAnyBrowsableFiles || !filesLoaded) && (
              <button
                type="button"
                onClick={() => setShowBrowser(!showBrowser)}
                className={cn(
                  "flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-colors",
                  showBrowser
                    ? "bg-[#2a14b4]/10 text-[#2a14b4]"
                    : "text-[#464554]/70 hover:text-[#464554] bg-[#eff4ff] hover:bg-[#dce9ff]",
                )}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Kies bestaand
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            multiple
            className="hidden"
            onChange={handleFileInputChange}
          />

          {/* File browser with folders */}
          {showBrowser && (
            <div className="bg-white rounded-xl border border-[#edf0f8] overflow-hidden">
              {filesLoading ? (
                <div className="px-4 py-6 text-center">
                  <Loader2 className="w-4 h-4 text-[#2a14b4] animate-spin mx-auto mb-2" />
                  <p className="text-xs text-[#464554]/50">Documenten laden...</p>
                </div>
              ) : allFiles.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs text-[#464554]/50">
                    Nog geen documenten. Upload een bestand om te beginnen.
                  </p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {/* Root files */}
                  {rootFiles
                    .filter((f) => !selectedFileIds.includes(f.id))
                    .map((file) => (
                      <FileRow
                        key={file.id}
                        file={file}
                        selected={false}
                        depth={0}
                        onToggle={toggleFileSelection}
                      />
                    ))}

                  {/* Folders */}
                  {folders.map((folder) => (
                    <FolderTree
                      key={folder.id}
                      folder={folder}
                      depth={0}
                      selectedFileIds={selectedFileIds}
                      openFolders={openFolders}
                      onToggleFolder={toggleFolder}
                      onToggleFile={toggleFileSelection}
                    />
                  ))}

                  {!hasAnyBrowsableFiles && (
                    <div className="px-4 py-4 text-center">
                      <p className="text-xs text-[#464554]/50">
                        Alle beschikbare documenten zijn al geselecteerd.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FolderTree({
  folder,
  depth,
  selectedFileIds,
  openFolders,
  onToggleFolder,
  onToggleFile,
}: {
  folder: Folder
  depth: number
  selectedFileIds: string[]
  openFolders: string[]
  onToggleFolder: (id: string) => void
  onToggleFile: (id: string) => void
}) {
  const extractableFiles = folder.files.filter(
    (f) => f.status === "UPLOADED" && isTextExtractable(f.content_type),
  )
  const hasContent =
    extractableFiles.length > 0 ||
    folder.children.some((child) => folderHasExtractableFiles(child, []))

  if (!hasContent) return null

  const isOpen = openFolders.includes(folder.id)
  const unselectedFiles = extractableFiles.filter((f) => !selectedFileIds.includes(f.id))

  return (
    <>
      <button
        type="button"
        onClick={() => onToggleFolder(folder.id)}
        className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-[#f8f9ff] transition-colors bg-[#fafbff]"
        style={{ paddingLeft: `${16 + depth * 16}px` }}
      >
        {isOpen ? (
          <ChevronDown className="w-3 h-3 text-[#464554]/40 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-[#464554]/40 flex-shrink-0" />
        )}
        <FolderOpen className="w-3.5 h-3.5 text-[#f9bd22] flex-shrink-0" />
        <span className="text-xs font-semibold text-[#0b1c30] truncate">{folder.name}</span>
        <span className="text-[10px] text-[#464554]/40 flex-shrink-0">
          {extractableFiles.length} {extractableFiles.length === 1 ? "bestand" : "bestanden"}
        </span>
      </button>

      {isOpen && (
        <>
          {unselectedFiles.map((file) => (
            <FileRow
              key={file.id}
              file={file}
              selected={selectedFileIds.includes(file.id)}
              depth={depth + 1}
              onToggle={onToggleFile}
            />
          ))}
          {extractableFiles.length > 0 && unselectedFiles.length === 0 && (
            <div
              className="px-4 py-2 text-[10px] text-[#464554]/40 italic"
              style={{ paddingLeft: `${32 + (depth + 1) * 16}px` }}
            >
              Alle bestanden geselecteerd
            </div>
          )}
          {folder.children.map((child) => (
            <FolderTree
              key={child.id}
              folder={child}
              depth={depth + 1}
              selectedFileIds={selectedFileIds}
              openFolders={openFolders}
              onToggleFolder={onToggleFolder}
              onToggleFile={onToggleFile}
            />
          ))}
        </>
      )}
    </>
  )
}

function FileRow({
  file,
  selected,
  depth,
  onToggle,
}: {
  file: FileRecord
  selected: boolean
  depth: number
  onToggle: (id: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(file.id)}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
        selected ? "bg-[#dce9ff]" : "hover:bg-[#f8f9ff]",
      )}
      style={{ paddingLeft: `${16 + depth * 16}px` }}
    >
      <FileText className="w-4 h-4 text-[#5c5378] flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#0b1c30] truncate">{file.name}</p>
        <p className="text-[10px] text-[#464554]/50">
          {getTypeLabel(file.content_type)} · {formatSize(file.size_bytes)}
        </p>
      </div>
      {selected ? (
        <Check className="w-3.5 h-3.5 text-[#2a14b4] flex-shrink-0" />
      ) : (
        <div className="w-3.5 h-3.5 rounded border border-[#c6cbe0] flex-shrink-0" />
      )}
    </button>
  )
}

function folderHasExtractableFiles(folder: Folder, excludeIds: string[]): boolean {
  const hasFiles = folder.files.some(
    (f) =>
      f.status === "UPLOADED" &&
      isTextExtractable(f.content_type) &&
      !excludeIds.includes(f.id),
  )
  if (hasFiles) return true
  return folder.children.some((child) => folderHasExtractableFiles(child, excludeIds))
}
