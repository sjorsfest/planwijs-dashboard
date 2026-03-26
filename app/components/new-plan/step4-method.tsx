import { BookOpen } from "lucide-react"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Card, CardContent } from "~/components/ui/card"
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
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest">
            Stap 4 van 6
          </Badge>
          <Badge className="text-[10px] font-black uppercase tracking-widest bg-black text-white">
            {selectedSubjectName}
          </Badge>
        </div>
        <h1 className="text-4xl font-black mb-1">Kies een methode</h1>
        <p className="text-sm text-black/60 font-medium">
          Selecteer de methode die je voor {selectedSubjectName} gebruikt.
        </p>
      </div>

      {methodsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border-2 border-black bg-white p-5 flex items-start justify-between gap-3 animate-pulse">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-black/10 w-3/4" />
                <div className="h-3 bg-black/10 w-1/3" />
              </div>
              <div className="h-7 w-20 bg-black/10 flex-shrink-0" />
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
              <Card key={method.id ?? method.slug} className="group cursor-pointer hover:bg-[#fdf4c4] transition-colors">
                <CardContent className="p-5 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm leading-tight">{method.title}</p>
                    {methodSubjectLabel && (
                      <p className="text-xs text-black/50 mt-1 font-medium">{methodSubjectLabel}</p>
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
    <div className="border-2 border-black border-dashed bg-white p-10 flex flex-col items-center gap-3 text-center">
      <div className="w-10 h-10 border-2 border-black bg-[#f5f0e8] flex items-center justify-center">
        <BookOpen className="w-5 h-5" />
      </div>
      <div>
        <p className="font-black text-sm">Niets gevonden</p>
        <p className="text-xs text-black/60 mt-0.5">{message}</p>
      </div>
    </div>
  )
}
