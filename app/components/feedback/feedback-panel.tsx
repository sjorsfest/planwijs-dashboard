import { useState, useEffect, useCallback } from "react"
import { useFetcher, useLocation } from "react-router"
import {
  ArrowLeft,
  ChevronUp,
  MessageSquare,
  MessageSquarePlus,
  Megaphone,
  Plus,
  Bug,
  Lightbulb,
  HelpCircle,
  Send,
  Trash2,
  LoaderCircle,
  X,
} from "lucide-react"
import { Button } from "~/components/ui/button"
import { Badge } from "~/components/ui/badge"
import { Input } from "~/components/ui/input"
import { Textarea } from "~/components/ui/textarea"

// ─── Types (duplicated to keep this self-contained) ───────────────────────

type FeedbackType = "BUG" | "SUGGESTION" | "OTHER"

interface Feedback {
  id: string
  user_id: string
  user_name: string
  route: string
  name: string
  description: string
  type: FeedbackType
  vote_count: number
  has_voted: boolean
  comment_count: number
  created_at: string
}

interface Comment {
  id: string
  user_id: string
  user_name: string
  text: string
  created_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const API_ROUTE = "/api/feedback"

function firstName(name: string): string {
  return name.split(" ")[0]
}

/** Replace UUIDs and long IDs in a path with readable placeholders. */
function sanitizeRoute(path: string): string {
  const segments = path.split("/")
  const routeNames: Record<string, string> = {
    lesplan: ":lesplanId",
    les: ":lessonId",
  }
  return segments
    .map((seg, i) => {
      // Match UUIDs or long hex/alphanumeric IDs (8+ chars)
      if (/^[0-9a-f]{8,}/i.test(seg) || /^[a-z0-9_-]{20,}$/i.test(seg)) {
        const prev = segments[i - 1]
        return prev && routeNames[prev] ? routeNames[prev] : ":id"
      }
      return seg
    })
    .join("/")
}


const TYPE_CONFIG: Record<
  FeedbackType,
  { label: string; variant: "destructive" | "default" | "outline"; icon: typeof Bug }
> = {
  BUG: { label: "Bug", variant: "destructive", icon: Bug },
  SUGGESTION: { label: "Suggestie", variant: "default", icon: Lightbulb },
  OTHER: { label: "Overig", variant: "outline", icon: HelpCircle },
}

type SortMode = "votes" | "newest"
type FilterType = "ALL" | FeedbackType
type View = "board" | "detail" | "new"

// ─── Floating Feedback Panel ──────────────────────────────────────────────

export function FeedbackPanel() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  return (
    <>
      {/* Feedback tab - right edge */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className={[
            "fixed z-40 right-0 top-1/2 -translate-y-1/2",
            "flex items-center gap-2",
            "bg-white text-[#0b1c30]",
            "px-3 py-3 lg:py-4",
            "rounded-l-2xl",
            "border border-r-0 border-[#e8eeff]",
            "shadow-[-2px_2px_16px_rgba(11,28,48,0.1)]",
            "hover:px-4 hover:shadow-[-4px_4px_24px_rgba(11,28,48,0.14)]",
            "active:px-3 transition-all duration-200",
            "group",
          ].join(" ")}
          aria-label="App feedback geven"
          style={{ writingMode: "vertical-lr" }}
        >
          <span className="flex items-center justify-center w-5 h-5 rounded-md bg-[#ffdf9f] text-[#4c3700] flex-shrink-0 rotate group-hover:scale-110 transition-transform">
            <Megaphone className="w-3 h-3" />
          </span>
          <span className="text-xs font-bold tracking-wide">Feedback</span>
        </button>
      )}

      {/* Slide-out panel */}
      {open && (
        <PanelContent
          currentRoute={location.pathname}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

// ─── Panel Content ────────────────────────────────────────────────────────

function PanelContent({
  currentRoute,
  onClose,
}: {
  currentRoute: string
  onClose: () => void
}) {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([])
  const [view, setView] = useState<View>("board")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>("ALL")
  const [sort, setSort] = useState<SortMode>("votes")

  const listFetcher = useFetcher()

  // Load feedback list on mount
  useEffect(() => {
    listFetcher.load(API_ROUTE)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update list when loaded
  useEffect(() => {
    if (listFetcher.data && "feedbackList" in listFetcher.data) {
      setFeedbackList(listFetcher.data.feedbackList as Feedback[])
    }
  }, [listFetcher.data])

  const isLoading = listFetcher.state !== "idle" && feedbackList.length === 0

  const filtered = feedbackList
    .filter((f) => filter === "ALL" || f.type === filter)
    .sort((a, b) =>
      sort === "votes"
        ? b.vote_count - a.vote_count
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

  const selected = selectedId ? feedbackList.find((f) => f.id === selectedId) ?? null : null

  function handleVoteOptimistic(id: string, voted: boolean, newCount: number) {
    setFeedbackList((prev) =>
      prev.map((f) => (f.id === id ? { ...f, has_voted: voted, vote_count: newCount } : f))
    )
  }

  const handleCreated = useCallback((feedback: Feedback) => {
    setFeedbackList((prev) => [feedback, ...prev])
    setView("board")
  }, [])

  function handleDeleted(id: string) {
    setFeedbackList((prev) => prev.filter((f) => f.id !== id))
    setView("board")
    setSelectedId(null)
  }

  function openDetail(id: string) {
    setSelectedId(id)
    setView("detail")
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/30 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed z-50 inset-y-0 right-0 w-full max-w-md bg-[#f8f9ff] shadow-[-4px_0px_24px_rgba(11,28,48,0.12)] flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#e8eeff] flex-shrink-0">
          {view !== "board" ? (
            <button
              onClick={() => {
                setView("board")
                setSelectedId(null)
              }}
              className="flex items-center gap-2 text-sm text-[#5c5378] hover:text-[#2a14b4] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Terug
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#ffdf9f]">
                <Megaphone className="w-4 h-4 text-[#4c3700]" />
              </span>
              <div>
                <h2 className="font-heading text-base font-bold text-[#0b1c30] leading-tight">Feedback</h2>
                <p className="text-[10px] text-[#5c5378] leading-tight">Help ons de app te verbeteren</p>
              </div>
            </div>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#eff4ff] flex items-center justify-center text-[#5c5378] hover:bg-[#dce9ff] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {view === "board" && (
            <BoardView
              items={filtered}
              filter={filter}
              sort={sort}
              isLoading={isLoading}
              onFilterChange={setFilter}
              onSortChange={setSort}
              onSelect={openDetail}
              onVote={handleVoteOptimistic}
              onNew={() => setView("new")}
            />
          )}
          {view === "detail" && selected && (
            <DetailView
              feedback={selected}
              onVote={handleVoteOptimistic}
              onDeleted={handleDeleted}
            />
          )}
          {view === "new" && (
            <NewFeedbackForm
              currentRoute={currentRoute}
              onCreated={handleCreated}
              onCancel={() => setView("board")}
            />
          )}
        </div>
      </div>
    </>
  )
}

// ─── Board View ───────────────────────────────────────────────────────────

function BoardView({
  items,
  filter,
  sort,
  isLoading,
  onFilterChange,
  onSortChange,
  onSelect,
  onVote,
  onNew,
}: {
  items: Feedback[]
  filter: FilterType
  sort: SortMode
  isLoading: boolean
  onFilterChange: (f: FilterType) => void
  onSortChange: (s: SortMode) => void
  onSelect: (id: string) => void
  onVote: (id: string, voted: boolean, count: number) => void
  onNew: () => void
}) {
  return (
    <div className="p-4">
      {/* New + filters */}
      <div className="flex items-center gap-2 mb-3">
        <Button size="sm" onClick={onNew}>
          <Plus className="w-4 h-4" />
          Nieuw
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {(["ALL", "BUG", "SUGGESTION", "OTHER"] as const).map((t) => (
          <button
            key={t}
            onClick={() => onFilterChange(t)}
            className={[
              "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
              filter === t
                ? "bg-gradient-to-br from-[#2a14b4] to-[#4338ca] text-white"
                : "bg-[#eff4ff] text-[#464554] hover:bg-[#dce9ff]",
            ].join(" ")}
          >
            {t === "ALL" ? "Alles" : TYPE_CONFIG[t].label}
          </button>
        ))}
        <div className="ml-auto flex gap-1">
          {(["votes", "newest"] as const).map((s) => (
            <button
              key={s}
              onClick={() => onSortChange(s)}
              className={[
                "px-2 py-1 rounded-lg text-[11px] font-semibold transition-all",
                sort === s
                  ? "bg-[#2a14b4]/10 text-[#2a14b4]"
                  : "text-[#464554] hover:bg-[#eff4ff]",
              ].join(" ")}
            >
              {s === "votes" ? "Stemmen" : "Nieuw"}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-[#5c5378]">
          <LoaderCircle className="w-5 h-5 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-[#5c5378]">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-semibold">Nog geen feedback</p>
          <p className="text-xs mt-1">Wees de eerste om feedback te geven</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((fb) => (
            <FeedbackCard
              key={fb.id}
              feedback={fb}
              onClick={() => onSelect(fb.id)}
              onVote={onVote}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Feedback Card ────────────────────────────────────────────────────────

function FeedbackCard({
  feedback,
  onClick,
  onVote,
}: {
  feedback: Feedback
  onClick: () => void
  onVote: (id: string, voted: boolean, count: number) => void
}) {
  const voteFetcher = useFetcher()
  const config = TYPE_CONFIG[feedback.type]
  const isVoting = voteFetcher.state !== "idle"

  function handleVote(e: React.MouseEvent) {
    e.stopPropagation()
    const newVoted = !feedback.has_voted
    const newCount = feedback.vote_count + (newVoted ? 1 : -1)
    onVote(feedback.id, newVoted, newCount)
    voteFetcher.submit(
      { intent: "vote", feedbackId: feedback.id },
      { method: "post", action: API_ROUTE }
    )
  }

  return (
    <div
      onClick={onClick}
      className="flex items-start gap-3 bg-white rounded-xl p-3 shadow-[0px_1px_6px_rgba(11,28,48,0.06)] hover:shadow-[0px_4px_16px_rgba(11,28,48,0.1)] transition-all cursor-pointer"
    >
      {/* Vote */}
      <button
        onClick={handleVote}
        disabled={isVoting}
        className={[
          "flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg transition-all flex-shrink-0 min-w-[36px]",
          feedback.has_voted
            ? "bg-[#2a14b4]/10 text-[#2a14b4]"
            : "bg-[#eff4ff] text-[#5c5378] hover:bg-[#dce9ff]",
        ].join(" ")}
      >
        <ChevronUp className="w-3.5 h-3.5" />
        <span className="text-xs font-bold leading-none">{feedback.vote_count}</span>
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1.5 flex-wrap">
          <h3 className="font-semibold text-[#0b1c30] text-sm leading-tight">{feedback.name}</h3>
          <Badge variant={config.variant} className="text-[10px] px-1.5 py-0">
            {config.label}
          </Badge>
        </div>
        <p className="text-[11px] text-[#5c5378] mt-0.5 line-clamp-1">{feedback.description}</p>
        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#5c5378]">
          <span>{firstName(feedback.user_name)}</span>
          <span>·</span>
          <span className="flex items-center gap-0.5">
            <MessageSquare className="w-3 h-3" />
            {feedback.comment_count}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Detail View ──────────────────────────────────────────────────────────

function DetailView({
  feedback,
  onVote,
  onDeleted,
}: {
  feedback: Feedback
  onVote: (id: string, voted: boolean, count: number) => void
  onDeleted: (id: string) => void
}) {
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState("")
  const commentsFetcher = useFetcher()
  const addCommentFetcher = useFetcher()
  const voteFetcher = useFetcher()
  const deleteFetcher = useFetcher()
  const deleteCommentFetcher = useFetcher()
  const config = TYPE_CONFIG[feedback.type]

  // Load comments
  useEffect(() => {
    commentsFetcher.submit(
      { intent: "loadComments", feedbackId: feedback.id },
      { method: "post", action: API_ROUTE }
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback.id])

  useEffect(() => {
    if (commentsFetcher.data && "comments" in commentsFetcher.data) {
      setComments(commentsFetcher.data.comments as Comment[])
    }
  }, [commentsFetcher.data])

  useEffect(() => {
    if (addCommentFetcher.data && "comment" in addCommentFetcher.data) {
      setComments((prev) => [...prev, addCommentFetcher.data.comment as Comment])
      setCommentText("")
    }
  }, [addCommentFetcher.data])

  useEffect(() => {
    if (deleteFetcher.data && "deleted" in deleteFetcher.data) {
      onDeleted(feedback.id)
    }
  }, [deleteFetcher.data, feedback.id, onDeleted])

  function handleVote() {
    const newVoted = !feedback.has_voted
    const newCount = feedback.vote_count + (newVoted ? 1 : -1)
    onVote(feedback.id, newVoted, newCount)
    voteFetcher.submit(
      { intent: "vote", feedbackId: feedback.id },
      { method: "post", action: API_ROUTE }
    )
  }

  function handleAddComment() {
    if (!commentText.trim()) return
    addCommentFetcher.submit(
      { intent: "comment", feedbackId: feedback.id, text: commentText.trim() },
      { method: "post", action: API_ROUTE }
    )
  }

  function handleDeleteComment(commentId: string) {
    setComments((prev) => prev.filter((c) => c.id !== commentId))
    deleteCommentFetcher.submit(
      { intent: "deleteComment", commentId },
      { method: "post", action: API_ROUTE }
    )
  }

  const isLoadingComments = commentsFetcher.state !== "idle"
  const isAddingComment = addCommentFetcher.state !== "idle"

  return (
    <div className="p-4">
      {/* Main content */}
      <div className="bg-white rounded-xl p-4 shadow-[0px_2px_8px_rgba(11,28,48,0.06)]">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-heading text-lg font-bold text-[#0b1c30]">{feedback.name}</h2>
              <Badge variant={config.variant}>{config.label}</Badge>
            </div>
            <p className="text-[11px] text-[#5c5378] mt-1">Route: {feedback.route}</p>
            <p className="text-[11px] text-[#5c5378]">
              {firstName(feedback.user_name)}
            </p>
          </div>
          <button
            onClick={() =>
              deleteFetcher.submit(
                { intent: "delete", feedbackId: feedback.id },
                { method: "post", action: API_ROUTE }
              )
            }
            className="text-[#5c5378] hover:text-[#ba1a1a] transition-colors p-1 flex-shrink-0"
            title="Verwijder feedback"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-[#0b1c30] mt-3 leading-relaxed whitespace-pre-wrap">
          {feedback.description}
        </p>

        <div className="mt-4">
          <Button
            variant={feedback.has_voted ? "default" : "outline"}
            size="sm"
            onClick={handleVote}
          >
            <ChevronUp className="w-4 h-4" />
            Stem ({feedback.vote_count})
          </Button>
        </div>
      </div>

      {/* Comments */}
      <div className="mt-4">
        <h3 className="text-sm font-bold text-[#0b1c30] mb-3">
          Reacties ({comments.length})
        </h3>

        {isLoadingComments ? (
          <div className="flex items-center justify-center py-6 text-[#5c5378]">
            <LoaderCircle className="w-4 h-4 animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-xs text-[#5c5378] py-3">Nog geen reacties</p>
        ) : (
          <div className="flex flex-col gap-2 mb-3">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="bg-white rounded-lg p-3 shadow-[0px_1px_4px_rgba(11,28,48,0.04)]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#5c5378]">
                    <span className="font-semibold text-[#0b1c30]">{firstName(comment.user_name)}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-[#5c5378] hover:text-[#ba1a1a] transition-colors p-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-sm text-[#0b1c30] mt-1">{comment.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Add comment */}
        <div className="flex gap-2">
          <Input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Schrijf een reactie..."
            className="flex-1 h-8 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleAddComment()
              }
            }}
          />
          <Button
            size="icon"
            className="h-8 w-8"
            onClick={handleAddComment}
            disabled={!commentText.trim() || isAddingComment}
          >
            {isAddingComment ? (
              <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── New Feedback Form ────────────────────────────────────────────────────

function NewFeedbackForm({
  currentRoute,
  onCreated,
  onCancel,
}: {
  currentRoute: string
  onCreated: (feedback: Feedback) => void
  onCancel: () => void
}) {
  const fetcher = useFetcher()
  const [type, setType] = useState<FeedbackType>("SUGGESTION")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const route = sanitizeRoute(currentRoute)

  const isSubmitting = fetcher.state !== "idle"

  useEffect(() => {
    if (fetcher.data && "created" in fetcher.data) {
      onCreated(fetcher.data.created as Feedback)
      setName("")
      setDescription("")
      setType("SUGGESTION")
    }
  }, [fetcher.data, onCreated])

  function handleSubmit() {
    if (!name.trim() || !description.trim()) return
    fetcher.submit(
      {
        intent: "create",
        name: name.trim(),
        description: description.trim(),
        type,
        route: route || "/",
      },
      { method: "post", action: API_ROUTE }
    )
  }

  return (
    <div className="p-4">
      <h2 className="font-heading text-lg font-bold text-[#0b1c30] mb-4">Nieuwe feedback</h2>

      <div className="flex flex-col gap-4">
        {/* Type */}
        <div>
          <label className="text-xs font-semibold text-[#0b1c30] mb-1.5 block">Type</label>
          <div className="flex gap-2">
            {(["BUG", "SUGGESTION", "OTHER"] as const).map((t) => {
              const cfg = TYPE_CONFIG[t]
              const Icon = cfg.icon
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={[
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    type === t
                      ? "bg-[#2a14b4]/10 text-[#2a14b4] ring-2 ring-[#2a14b4]/30"
                      : "bg-[#eff4ff] text-[#464554] hover:bg-[#dce9ff]",
                  ].join(" ")}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Route (read-only) */}
        <div className="flex items-center gap-2 rounded-xl bg-[#eff4ff] px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[#5c5378]">Pagina:</span>
          <span className="text-xs font-medium text-[#0b1c30] truncate">{route}</span>
        </div>

        {/* Title */}
        <div>
          <label className="text-xs font-semibold text-[#0b1c30] mb-1.5 block">Titel</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Korte beschrijving"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-semibold text-[#0b1c30] mb-1.5 block">Beschrijving</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Beschrijf wat je hebt gedaan en wat er mis ging..."
            rows={4}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-1">
          <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Annuleer
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || !description.trim() || isSubmitting}>
            {isSubmitting ? (
              <>
                <LoaderCircle className="w-4 h-4 animate-spin" />
                Verzenden...
              </>
            ) : (
              "Verzenden"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
