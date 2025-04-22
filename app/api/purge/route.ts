import { NextResponse } from "next/server"
import { triggerDatabasePurge } from "@/lib/room-utils"

export async function POST() {
  try {
    const success = await triggerDatabasePurge()

    if (success) {
      return NextResponse.json({ success: true, message: "Database purged successfully" })
    } else {
      return NextResponse.json({ success: false, message: "Failed to purge database" }, { status: 500 })
    }
  } catch (error: any) {
    console.error("Error purging database:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
