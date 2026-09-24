// Liveness probe for the container HEALTHCHECK and HAProxy.
export const prerender = false;

export function GET() {
  return new Response("ok", {
    headers: { "content-type": "text/plain", "cache-control": "no-store" },
  });
}
