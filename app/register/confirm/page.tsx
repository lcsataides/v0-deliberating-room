import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"

export default function ConfirmPage() {
  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <Card className="w-full max-w-md rounded-lg">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Registro Concluído! 🎉</CardTitle>
          <CardDescription className="text-center">Verifique seu email para confirmar sua conta</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p>Enviamos um link de confirmação para o seu email. Por favor, clique no link para ativar sua conta.</p>
          <p className="mt-4">
            Não recebeu o email? Verifique sua pasta de spam ou solicite um novo link de confirmação.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/login">
            <Button>Ir para o Login</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
