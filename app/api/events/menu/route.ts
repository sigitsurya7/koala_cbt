export const runtime = "nodejs";
import { menuEvents } from "@/lib/events";

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      const enc = (data: any) =>
        `data: ${JSON.stringify(data)}\n\n`;

      const onMessage = (payload: unknown) => {
        const chunk = enc({ type: "menu", payload });
        controller.enqueue(new TextEncoder().encode(chunk));
      };

      menuEvents.on("message", onMessage);

      // Send initial ping to establish stream
      controller.enqueue(new TextEncoder().encode("event: ping\n" + enc({ ok: true })));

      return () => {
        menuEvents.off("message", onMessage);
      };
    },
    cancel() {
      // no-op
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

