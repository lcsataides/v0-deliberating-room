import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Footer from "@/components/footer"

// Array de GIFs inspiradores sobre tecnologia e trabalho em equipe
const inspiringGifs = [
  "https://media.giphy.com/media/l0MYsNWnIu9aUuYLK/giphy.gif", // RuPaul
  "https://media.giphy.com/media/3oKIPrc2ngFZ6BTyww/giphy.gif", // Tech team high five
  "https://media.giphy.com/media/xT9DPIlGnuHpr2yObu/giphy.gif", // Team celebration
  "https://media.giphy.com/media/l46CyJmS9KUbokzsI/giphy.gif", // Team success
  "https://media.giphy.com/media/QMHoU66sBXqqLqYvGO/giphy.gif", // Tech innovation
]

// Selecionar um GIF aleatório a cada renderização
function getRandomGif() {
  const randomIndex = Math.floor(Math.random() * inspiringGifs.length)
  return inspiringGifs[randomIndex]
}

export default function Home() {
  const randomGif = getRandomGif()

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Moving gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-gradient-slow"></div>

      <div className="container flex flex-col items-center justify-center min-h-screen py-12 relative z-10">
        <div className="relative w-full max-w-md">
          {/* GIF sobreposto estilizado */}
          <div className="relative w-[125%] h-64 -ml-[12.5%] -mb-16 z-10">
            <Image
              src={randomGif || "/placeholder.svg"}
              alt="Equipe inspiradora celebrando sucesso"
              fill
              style={{ objectFit: "cover" }}
              className="rounded-3xl shadow-lg transform hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Card principal */}
          <Card className="w-full rounded-lg pt-12 relative z-0 shadow-md">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold">Deliberating Room 🏆</CardTitle>
              <CardDescription>Crie ou entre em uma sala de deliberação 👥</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">
                  Crie uma nova sala como líder ou entre em uma sala existente para participar da votação.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Link href="/create" className="w-full">
                <Button className="w-full rounded-sm bg-gradient-to-r from-blue-500 to-blue-700" size="lg">
                  Criar Nova Sala 🚀
                </Button>
              </Link>
              <Link href="/join" className="w-full">
                <Button variant="outline" className="w-full rounded-sm" size="lg">
                  Entrar em uma Sala 🚪
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  )
}
