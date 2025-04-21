import { NextResponse } from "next/server"
import { getRoom } from "@/lib/room-utils"

export async function GET(request: Request, { params }: { params: { roomId: string } }) {
  try {
    const roomId = params.roomId

    // Check if room exists
    const room = await getRoom(roomId)

    if (!room) {
      return NextResponse.json(
        {
          exists: false,
          message: "Room not found",
        },
        { status: 404 },
      )
    }

    // Return basic room info
    return NextResponse.json({
      exists: true,
      title: room.title,
      userCount: room.users.length + 1,
      currentRoundOpen: room.currentRound.isOpen,
      currentRoundTopic: room.currentRound.topic,
      hasHistory: room.history.length > 0,
    })
  } catch (error: any) {
    console.error("Error checking room status:", error)

    return NextResponse.json(
      {
        error: error.message || "An error occurred while checking room status",
        exists: false,
      },
      { status: 500 },
    )
  }
}
