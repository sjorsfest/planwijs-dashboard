export function LessonSeriesHeader({
  title,
  bookCoverUrl,
  bookTitle,
}: {
  title?: string
  bookCoverUrl?: string
  bookTitle?: string
}) {
  return (
    <section className="bg-white rounded-3xl p-6 shadow-[0px_18px_36px_rgba(11,28,48,0.08)] border border-[#e8eeff]">
      <div className="flex items-start gap-4">
        {bookCoverUrl ? (
          <img
            src={bookCoverUrl}
            alt={bookTitle ? `Boekcover van ${bookTitle}` : "Boekcover"}
            className="w-14 h-20 md:w-16 md:h-24 rounded-lg object-cover border border-[#e8eeff] shadow-sm shrink-0"
            loading="lazy"
          />
        ) : (
          <div className="w-14 h-20 md:w-16 md:h-24 rounded-lg bg-[#eff4ff] border border-[#e8eeff] shrink-0" aria-hidden="true" />
        )}

        <div className="min-w-0">
          {title ? (
            <h1 className="text-4xl font-bold tracking-tight text-[#0b1c30] leading-tight">{title}</h1>
          ) : (
            <div className="h-10 w-2/3 rounded-xl bg-[#eff4ff] animate-pulse" />
          )}

          <p className="mt-4 text-sm text-[#464554] leading-6 max-w-3xl">
            Controleer deze lessenreeks. Na goedkeuring worden gedetailleerde lessen met tijdsblokken gegenereerd.
          </p>
        </div>
      </div>
    </section>
  )
}
