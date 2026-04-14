import { data, type LoaderFunctionArgs } from "react-router"
import { createApiClient } from "~/lib/backend/client"
import { requireAuthContext } from "~/lib/auth.server"

export async function loader({ request }: LoaderFunctionArgs) {
  const { token } = await requireAuthContext(request)
  const api = createApiClient(token)

  const [folders, allFiles] = await Promise.all([api.listFolders(), api.listFiles()])
  const rootFiles = allFiles.filter((f) => f.folder_id === null)

  return data({ folders, rootFiles }, { headers: { "Cache-Control": "private, max-age=30" } })
}
