import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getArtifactById } from "@/lib/db/queries/artifacts";
import {
  validateArtifact,
  validateMultipleArtifacts,
} from "@/lib/ai/agents/artifact-validator";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.id || role !== "admin") {
    return null;
  }
  return session;
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, artifactIds } = body;

    if (action === "validate-one") {
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

      const result = await validateArtifact({
        artifactType: artifact.artifactType,
        subject: artifact.subject,
        yearGroup: artifact.yearGroup,
        examBoard: artifact.examBoard,
        topic: artifact.topic,
        contentJson: artifact.contentJson as Record<string, unknown>,
      });

      return NextResponse.json({ id: artifact.id, result });
    }

    if (action === "validate-multiple") {
      if (!artifactIds || !Array.isArray(artifactIds) || artifactIds.length === 0) {
        return NextResponse.json(
          { error: "artifactIds array required" },
          { status: 400 }
        );
      }

      const artifacts = await Promise.all(
        artifactIds.map((id: string) => getArtifactById(id))
      );

      const validArtifacts = artifacts.filter(Boolean).map((a) => ({
        id: a!.id,
        artifactType: a!.artifactType,
        subject: a!.subject,
        yearGroup: a!.yearGroup,
        examBoard: a!.examBoard,
        topic: a!.topic,
        contentJson: a!.contentJson as Record<string, unknown>,
      }));

      const results = await validateMultipleArtifacts(validArtifacts);
      return NextResponse.json({ results });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[artifact-validator] error:", error);
    return NextResponse.json(
      { error: "Validation failed" },
      { status: 500 }
    );
  }
}
