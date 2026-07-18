import { getJob } from "@/lib/services/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Server-Sent Events stream of live job progress (polling fallback exists on GET /api/jobs/:id). */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  if (!getJob(jobId)) {
    return new Response("job not found", { status: 404 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = () => {
        if (closed) return;
        const job = getJob(jobId);
        if (!job) {
          cleanup();
          return;
        }
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(job)}\n\n`));
        } catch {
          cleanup();
          return;
        }
        if (job.status === "completed" || job.status === "failed" || job.status === "partial") {
          cleanup();
        }
      };
      const timer = setInterval(send, 700);
      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(timer);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
      req.signal.addEventListener("abort", cleanup);
      send();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
