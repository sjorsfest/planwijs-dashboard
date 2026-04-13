export { default } from "./page"

import { data } from "react-router"
import { createApiClient } from "~/lib/backend/client"
import { requireAuthContext } from "~/lib/auth.server"
import type { Route } from "./+types/route"

export function meta() {
  return [{ title: "Documenten | Leslab" }]
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return {
    "Cache-Control": loaderHeaders.get("Cache-Control") ?? "",
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  const { token } = await requireAuthContext(request)
  const api = createApiClient(token)
  const [folders, allFiles] = await Promise.all([
    api.listFolders(),
    api.listFiles(),
  ])
  const rootFiles = allFiles.filter((f) => f.folder_id === null)
  return data({ folders, rootFiles }, { headers: { "Cache-Control": "private, max-age=5" } })
}

export async function action({ request }: Route.ActionArgs) {
  const { token } = await requireAuthContext(request)
  const api = createApiClient(token)
  const formData = await request.formData()
  const intent = formData.get("intent")

  if (intent === "delete-file") {
    const fileId = formData.get("fileId") as string
    await api.deleteFile(fileId)
    return data({ ok: true })
  }

  if (intent === "move-file") {
    const fileId = formData.get("fileId") as string
    const folderId = formData.get("folderId") as string | null
    await api.moveFile(fileId, folderId === "" ? null : folderId)
    return data({ ok: true })
  }

  if (intent === "create-folder") {
    const name = formData.get("name") as string
    const parentId = formData.get("parentId") as string | null
    await api.createFolder(name, parentId === "" ? null : parentId)
    return data({ ok: true })
  }

  if (intent === "rename-folder") {
    const folderId = formData.get("folderId") as string
    const name = formData.get("name") as string
    await api.updateFolder(folderId, { name })
    return data({ ok: true })
  }

  if (intent === "move-folder") {
    const folderId = formData.get("folderId") as string
    const parentId = formData.get("parentId") as string | null
    await api.updateFolder(folderId, { parent_id: parentId === "" ? null : parentId })
    return data({ ok: true })
  }

  if (intent === "delete-folder") {
    const folderId = formData.get("folderId") as string
    await api.deleteFolder(folderId)
    return data({ ok: true })
  }

  return data({ ok: false }, { status: 400 })
}
