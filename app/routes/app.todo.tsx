export function meta() {
  return [{ title: "To Do's — Planwijs" }]
}

export default function TodosPage() {
  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-4xl font-bold mb-1.5 text-[#0b1c30]">To Do's</h1>
      <p className="text-[#464554] text-sm">
        Hier zie je straks je taken en actiepunten.
      </p>
    </div>
  )
}
