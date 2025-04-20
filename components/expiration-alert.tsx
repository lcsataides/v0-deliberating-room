import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function ExpirationAlert() {
  return (
    <Alert className="bg-yellow-50 border-yellow-200 mb-6">
      <AlertCircle className="h-4 w-4 text-yellow-600" />
      <AlertDescription className="text-yellow-700">
        Sua conta e todos os dados serão automaticamente excluídos após 24 horas.
      </AlertDescription>
    </Alert>
  )
}
