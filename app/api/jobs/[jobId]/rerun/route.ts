import { NextResponse } from "next/server";
import { z } from "zod";
import { rerunTarget } from "@/lib/services/rerun";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    checkId: z.string().min(1).optional(),
    stage: z.enum(["rules", "lighthouse", "axe", "security", "links", "ai"]).optional(),
  })
  .refine((b) => b.checkId || b.stage, { message: "checkId or stage required" });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Body must be { checkId } or { stage }" }, { status: 400 });
  }

  const result = await rerunTarget(jobId, parsed);
  if (!result.ok) return NextResponse.json(result, { status: 422 });
  return NextResponse.json(result);
}
