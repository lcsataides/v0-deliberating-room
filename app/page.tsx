import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-screen py-12">
      <Card className="w-full max-w-md rounded-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Deliberating Room 🏆</CardTitle>
          <CardDescription>Crie ou entre em uma sala de deliberação 👥</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <div className="relative w-full h-64 rounded-md overflow-hidden">
              <Image
                src="https://media.giphy.com/media/l0MYsNWnIu9aUuYLK/giphy.gif"
                alt="RuPaul saying 'the judges and I will deliberate'"
                fill
                style={{ objectFit: "cover" }}
                className="rounded-md"
              />
            </div>
          </div>
          <div className="text-center space-y-2 mt-4">
            <p className="text-muted-foreground">
              Crie uma nova sala como líder ou entre em uma sala existente para participar da votação.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Link href="/create" className="w-full">
            <Button className="w-full rounded-sm" size="lg">
              Criar Sala 🚀
            </Button>
          </Link>
          <Link href="/join" className="w-full">
            <Button variant="outline" className="w-full rounded-sm" size="lg">
              Entrar na Sala 🔑
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
