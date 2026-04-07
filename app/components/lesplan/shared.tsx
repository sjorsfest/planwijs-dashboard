import type React from "react"

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5c5378]/70">{children}</p>
  )
}

type MarkdownBlock =
  | { type: "paragraph"; text: string }
  | { type: "unordered_list"; items: string[] }
  | { type: "ordered_list"; items: string[] }

type MarkdownListType = "unordered_list" | "ordered_list"

function parseMarkdownBlocks(value: string): MarkdownBlock[] {
  const normalized = value.replace(/\r\n?/g, "\n").trim()
  if (!normalized) return []

  const blocks: MarkdownBlock[] = []
  const lines = normalized.split("\n")
  let paragraphLines: string[] = []
  let listItems: string[] = []
  let listType: MarkdownListType | null = null

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return
    blocks.push({ type: "paragraph", text: paragraphLines.join(" ").trim() })
    paragraphLines = []
  }

  const flushList = () => {
    if (listType === null || listItems.length === 0) {
      listType = null
      listItems = []
      return
    }
    blocks.push({ type: listType, items: [...listItems] })
    listType = null
    listItems = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      flushParagraph()
      flushList()
      continue
    }

    const unorderedMatch = line.match(/^[-*+]\s+(.+)$/)
    if (unorderedMatch) {
      flushParagraph()
      if (listType !== "unordered_list") flushList()
      listType = "unordered_list"
      listItems.push(unorderedMatch[1].trim())
      continue
    }

    const orderedMatch = line.match(/^\d+[.)]\s+(.+)$/)
    if (orderedMatch) {
      flushParagraph()
      if (listType !== "ordered_list") flushList()
      listType = "ordered_list"
      listItems.push(orderedMatch[1].trim())
      continue
    }

    flushList()
    paragraphLines.push(line)
  }

  flushParagraph()
  flushList()
  return blocks
}

function renderInlineMarkdown(value: string): React.ReactNode[] {
  const pattern = /(\*\*[^*\n]+\*\*|__[^_\n]+__|`[^`\n]+`|\[[^\]]+\]\((https?:\/\/[^\s)]+)\)|\*[^*\n]+\*|_[^_\n]+_)/g
  const nodes: React.ReactNode[] = []
  let cursor = 0
  let index = 0

  for (const match of value.matchAll(pattern)) {
    const token = match[0]
    const matchIndex = match.index ?? 0
    if (matchIndex > cursor) {
      nodes.push(value.slice(cursor, matchIndex))
    }

    const linkMatch = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/)
    if (linkMatch) {
      nodes.push(
        <a
          key={`md-link-${index}`}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer noopener"
          className="font-semibold text-[#2a14b4] hover:text-[#4338ca] underline decoration-[#2a14b4]/40"
        >
          {linkMatch[1]}
        </a>
      )
      cursor = matchIndex + token.length
      index += 1
      continue
    }

    if (
      (token.startsWith("**") && token.endsWith("**")) ||
      (token.startsWith("__") && token.endsWith("__"))
    ) {
      nodes.push(
        <strong key={`md-strong-${index}`} className="font-semibold text-[#0b1c30]">
          {token.slice(2, -2)}
        </strong>
      )
    } else if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(
        <code key={`md-code-${index}`} className="rounded bg-[#eff4ff] px-1.5 py-0.5 text-[0.85em] text-[#2a14b4]">
          {token.slice(1, -1)}
        </code>
      )
    } else if ((token.startsWith("*") && token.endsWith("*")) || (token.startsWith("_") && token.endsWith("_"))) {
      nodes.push(<em key={`md-em-${index}`}>{token.slice(1, -1)}</em>)
    } else {
      nodes.push(token)
    }

    cursor = matchIndex + token.length
    index += 1
  }

  if (cursor < value.length) {
    nodes.push(value.slice(cursor))
  }

  return nodes
}

export function SeriesSummaryMarkdown({ value }: { value: string }) {
  const blocks = parseMarkdownBlocks(value)
  if (blocks.length === 0) return null

  return (
    <div className="space-y-3">
      {blocks.map((block, blockIndex) => {
        if (block.type === "paragraph") {
          return (
            <p key={`paragraph-${blockIndex}`} className="text-sm leading-7 text-[#464554] font-medium">
              {renderInlineMarkdown(block.text)}
            </p>
          )
        }

        const ListTag = block.type === "ordered_list" ? "ol" : "ul"
        return (
          <ListTag
            key={`list-${blockIndex}`}
            className={[
              "space-y-2 text-sm leading-6 text-[#464554] pl-5",
              block.type === "ordered_list" ? "list-decimal" : "list-disc",
            ].join(" ")}
          >
            {block.items.map((item, itemIndex) => (
              <li key={`${item}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
            ))}
          </ListTag>
        )
      })}
    </div>
  )
}

export function SkeletonLines({ streaming, lines = 3 }: { streaming: boolean; lines?: number }) {
  if (!streaming) return null
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`h-3.5 bg-[#eff4ff] rounded-full ${
            index === lines - 1 ? "w-3/5" : index % 2 === 0 ? "w-full" : "w-5/6"
          }`}
        />
      ))}
    </div>
  )
}

export function SkeletonTags({ streaming }: { streaming: boolean }) {
  if (!streaming) return null
  return (
    <div className="flex flex-wrap gap-2 animate-pulse">
      {[90, 110, 75, 130, 95, 115].map((width, index) => (
        <div key={index} className="h-8 bg-[#eff4ff] rounded-full" style={{ width: `${width}px` }} />
      ))}
    </div>
  )
}

export function SkeletonLessonCards({ streaming }: { streaming: boolean }) {
  if (!streaming) return null
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((index) => (
        <div
          key={index}
          className="bg-white rounded-2xl p-5 flex gap-4 shadow-[0px_8px_24px_rgba(11,28,48,0.05)] border border-[#e8eeff]"
        >
          <div className="w-9 h-9 rounded-full bg-[#dce9ff] shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-[#dce9ff] rounded-full w-2/5" />
            <div className="h-3 bg-[#eff4ff] rounded-full w-full" />
            <div className="h-3 bg-[#eff4ff] rounded-full w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}
