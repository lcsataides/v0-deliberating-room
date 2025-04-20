import { updateObserverStatus } from "@/lib/room-utils"

export async function POST(request: Request, { params }: { params: { roomId: string; userId: string } }) {
  return updateObserverStatus(request, params.roomId, params.userId)
}
