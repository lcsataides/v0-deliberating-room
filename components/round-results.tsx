import type { RoundResult } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"

interface RoundResultsProps {
  result: RoundResult
  topic: string
}

export default function RoundResults({ result, topic }: RoundResultsProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Resultados da Rodada 📊</h3>
        <div className="text-sm font-medium text-primary">{topic}</div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-bold">{result.average.toFixed(1)}</div>
              <p className="text-sm text-muted-foreground mt-1">Média 📏</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-bold">{result.mode.join(", ")}</div>
              <p className="text-sm text-muted-foreground mt-1">Mais Comum 🔍</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-bold">{result.totalVotes}</div>
              <p className="text-sm text-muted-foreground mt-1">Total de Votos 🗳️</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
