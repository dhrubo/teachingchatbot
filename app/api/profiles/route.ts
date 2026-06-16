import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { createStudent, getStudentsByUserId } from "@/lib/db/queries/student";
import { cookies } from "next/headers";

export async function GET() {
  const session = await auth();
  if (
    !session?.user?.id ||
    (session.user as { type?: string }).type === "guest"
  ) {
    return NextResponse.json({ profiles: [], activeProfile: null });
  }

  try {
    const userId = session.user.id;
    const profiles = await getStudentsByUserId({ userId });

    const cookieStore = await cookies();
    const activeStudentId = cookieStore.get("active_student_id")?.value;

    const activeProfile = activeStudentId
      ? profiles.find((p) => p.id === activeStudentId) || null
      : null;

    return NextResponse.json({ profiles, activeProfile });
  } catch (error) {
    console.error("Failed to get profiles:", error);
    return NextResponse.json(
      { error: "Failed to get profiles" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (
    !session?.user?.id ||
    (session.user as { type?: string }).type === "guest"
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, schoolYear, selectedSubjects, examBoard } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const userId = session.user.id;
    const profile = await createStudent({
      userId,
      name,
      schoolYear: schoolYear as "8" | "9" | undefined,
      selectedSubjects,
      examBoard,
    });

    const cookieStore = await cookies();
    cookieStore.set("active_student_id", profile.id, {
      httpOnly: true,
      secure: true,
      path: "/",
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Failed to create profile:", error);
    return NextResponse.json(
      { error: "Failed to create profile" },
      { status: 500 }
    );
  }
}
