import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Footer from "@/components/footer"
import DirectRoomEntry from "@/components/direct-room-entry"

// Array of inspiring GIFs about technology and teamwork
const inspiringGifs = [
  "https://media.giphy.com/media/l0MYsNWnIu9aUuYLK/giphy.gif", // RuPaul
  "https://media.giphy.com/media/3oKIPrc2ngFZ6BTyww/giphy.gif", // Tech team high five
  "https://media.giphy.com/media/xT9DPIlGnuHpr2yObu/giphy.gif", // Team celebration
  "https://media.giphy.com/media/l46CyJmS9KUbokzsI/giphy.gif", // Team success
  "https://media.giphy.com/media/QMHoU66sBXqqLqYvGO/giphy.gif", // Tech innovation
]

// Select a random GIF for each render
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

      <div className="container flex flex-col items-center justify-center min-h-screen py-12 relative z-10 px-4 sm:px-6">
        <div className="relative w-full max-w-md">
          {/* Overlaid styled GIF */}
          <div className="relative w-[125%] h-48 sm:h-64 -ml-[12.5%] -mb-12 sm:-mb-16 z-10">
            <Image
              src={randomGif || "/placeholder.svg"}
              alt="Inspiring team celebrating success"
              fill
              style={{ objectFit: "cover" }}
              className="rounded-3xl shadow-lg transform hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Main card */}
          <Card className="w-full rounded-lg pt-10 sm:pt-12 relative z-0 shadow-lg">
            <CardHeader className="text-center px-6 pt-6 pb-4">
              <CardTitle className="text-2xl sm:text-3xl font-bold">Deliberating Room 🏆</CardTitle>
              <CardDescription>Create or join a deliberation room 👥</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 px-6">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">
                  Create a new room as a leader or join an existing room to participate in voting.
                </p>
              </div>

              {/* Direct room entry component */}
              <DirectRoomEntry />
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 px-6 pb-6 pt-2">
              <Link href="/create" className="w-full">
                <Button
                  className="w-full rounded-sm bg-gradient-to-r from-blue-500 to-blue-700 h-11 text-base"
                  size="lg"
                >
                  Create New Room 🚀
                </Button>
              </Link>
              <Link href="/join" className="w-full">
                <Button variant="outline" className="w-full rounded-sm h-11 text-base" size="lg">
                  Join a Room 🚪
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
