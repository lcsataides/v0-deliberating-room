import { NextResponse } from "next/server"
import { getRoom } from "@/lib/room-utils"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const roomId = url.searchParams.get("id")

    if (!roomId) {
      return NextResponse.json({ exists: false, error: "Room ID is required" }, { status: 400 })
    }

    // Check if room exists
    const room = await getRoom(roomId)

    return NextResponse.json({
      exists: !!room,
      title: room?.title || null,
    })
  } catch (error: any) {
    console.error("Error checking room:", error)
    return NextResponse.json({ exists: false, error: error.message }, { status: 500 })
  }
}
