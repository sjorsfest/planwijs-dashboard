import { BookOpen } from "lucide-react"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Card, CardContent } from "~/components/ui/card"
import { SubjectBadge } from "~/components/ui/subject-badge"
import { getMethodSubjectLabel, type Method } from "./types"

interface Props {
  selectedSubjectName: string
  methods: Method[]
  methodsLoading: boolean
  onMethodSelect: (method: Method) => void
}

export function Step4Method({ selectedSubjectName, methods, methodsLoading, onMethodSelect }: Props) {
  return (
    <>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-widest">
            Stap 4 van 6
          </Badge>
          <SubjectBadge
            subjectName={selectedSubjectName}
            variant="default"
            className="text-[10px] font-semibold uppercase tracking-widest"
          />
        </div>
        <h1 className="text-4xl font-bold mb-1.5 text-[#0b1c30]">Kies een methode</h1>
        <p className="text-sm text-[#464554]">
          Selecteer de methode die je voor {selectedSubjectName} gebruikt.
        </p>
      </div>

      {methodsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[#eff4ff] rounded-2xl p-5 flex items-start justify-between gap-3 animate-pulse">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-[#0b1c30]/10 w-3/4 rounded" />
                <div className="h-3 bg-[#0b1c30]/10 w-1/3 rounded" />
              </div>
              <div className="h-7 w-20 bg-[#0b1c30]/10 rounded-lg flex-shrink-0" />
            </div>
          ))}
        </div>
      ) : methods.length === 0 ? (
        <EmptyState message={`Geen methodes beschikbaar voor ${selectedSubjectName}.`} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {methods.map((method) => {
            const methodSubjectLabel = getMethodSubjectLabel(method)
            return (
              <Card key={method.id ?? method.slug} className="group cursor-pointer hover:shadow-[0px_24px_48px_rgba(11,28,48,0.1)] transition-all hover:-translate-y-0.5">
                <CardContent className="p-5 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[#0b1c30] leading-tight">{method.title}</p>
                    {methodSubjectLabel && (
                      <p className="text-xs text-[#464554] mt-1">{methodSubjectLabel}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="h-7 text-xs flex-shrink-0"
                    onClick={() => onMethodSelect(method)}
                  >
                    Selecteer
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-2xl p-10 flex flex-col items-center gap-3 text-center shadow-[0px_24px_40px_rgba(11,28,48,0.07)]">
      <div className="w-10 h-10 rounded-2xl bg-[#eff4ff] flex items-center justify-center">
        <BookOpen className="w-5 h-5 text-[#5c5378]" />
      </div>
      <div>
        <p className="font-semibold text-sm text-[#0b1c30]">Niets gevonden</p>
        <p className="text-xs text-[#464554] mt-0.5">{message}</p>
      </div>
    </div>
  )
}
