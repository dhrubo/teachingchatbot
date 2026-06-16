import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentId } = body;

    const cookieStore = await cookies();

    if (!studentId) {
      cookieStore.delete("active_student_id");
    } else {
      cookieStore.set("active_student_id", studentId, {
        httpOnly: true,
        secure: true,
        path: "/",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to set active profile:", error);
    return NextResponse.json(
      { error: "Failed to set active profile" },
      { status: 500 }
    );
  }
}
