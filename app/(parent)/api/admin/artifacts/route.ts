import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import {
  listArtifacts,
  getArtifactById,
  updateArtifactStatus,
  type ArtifactType,
  type ArtifactStatus,
} from "@/lib/db/queries/artifacts";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.id || role !== "admin") {
    return null;
  }
  return session;
}

function parseSearchParams(url: string) {
  const u = new URL(url);
  return {
    subject: u.searchParams.get("subject") ?? undefined,
    yearGroup: u.searchParams.get("yearGroup")
      ? Number(u.searchParams.get("yearGroup"))
      : undefined,
    artifactType: (u.searchParams.get("artifactType") as ArtifactType) ?? undefined,
    status: (u.searchParams.get("status") as ArtifactStatus) ?? undefined,
    limit: u.searchParams.get("limit")
      ? Number(u.searchParams.get("limit"))
      : undefined,
    offset: u.searchParams.get("offset")
      ? Number(u.searchParams.get("offset"))
      : undefined,
  };
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const params = parseSearchParams(request.url);
  const result = await listArtifacts(params);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { action, artifactId, status, reviewedBy } = body;

  if (action === "update-status") {
    if (!artifactId || !status) {
      return NextResponse.json(
        { error: "artifactId and status required" },
        { status: 400 }
      );
    }

    const validStatuses: ArtifactStatus[] = ["draft", "approved", "rejected"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status: ${status}` },
        { status: 400 }
      );
    }

    const updated = await updateArtifactStatus(
      artifactId,
      status as ArtifactStatus,
      reviewedBy
    );
    if (!updated) {
      return NextResponse.json(
        { error: "Artifact not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ artifact: updated });
  }

  if (action === "get") {
    if (!body.artifactId) {
      return NextResponse.json(
        { error: "artifactId required" },
        { status: 400 }
      );
    }
    const artifact = await getArtifactById(body.artifactId);
    if (!artifact) {
      return NextResponse.json(
        { error: "Artifact not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ artifact });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
