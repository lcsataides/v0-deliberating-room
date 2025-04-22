import type { RoundHistoryItem } from "@/lib/types"

interface VotingHistoryProps {
  history: RoundHistoryItem[]
}

export default function VotingHistory({ history }: VotingHistoryProps) {
  return (
    <div className="space-y-4">
      {history.map((item, index) => (
        <div key={index} className="border rounded-lg p-4 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium">Round {history.length - index}</h4>
            <span className="text-sm text-muted-foreground">{new Date(item.timestamp).toLocaleString()}</span>
          </div>
          <div className="text-sm font-medium mb-3 text-primary">{item.topic}</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>Average 📏:</div>
            <div className="font-medium">{item.result.average.toFixed(1)}</div>

            <div>Most Common 🔍:</div>
            <div className="font-medium">{item.result.mode.join(", ")}</div>

            <div>Total Votes 🗳️:</div>
            <div className="font-medium">{item.result.totalVotes}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
