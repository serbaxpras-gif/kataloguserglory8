import { getStore } from "@netlify/blobs";
import { timingSafeEqual, randomUUID } from "node:crypto";

function isAdmin(req) {
  const real = process.env.ADMIN_KEY || "";
  const got = req.headers.get("x-admin-key") || "";
  if (real.length < 8 || real.length !== got.length) return false;
  return timingSafeEqual(Buffer.from(real), Buffer.from(got));
}

const J = { "content-type": "application/json", "access-control-allow-origin": "*" };

export default async (req) => {
  const store = getStore("photos");
  if (req.method === "GET") {
    const id = new URL(req.url).searchParams.get("id") || "";
    if (!/^[a-z0-9]{8,40}$/.test(id)) return new Response("Not found", { status: 404 });
    const item = await store.getWithMetadata(id, { type: "arrayBuffer" });
    if (!item) return new Response("Not found", { status: 404 });
    return new Response(item.data, {
      headers: {
        "content-type": (item.metadata && item.metadata.type) || "image/jpeg",
        "cache-control": "public, max-age=31536000, immutable",
        "access-control-allow-origin": "*",
      },
    });
  }
  if (req.method === "POST") {
    if (!isAdmin(req)) return new Response('{"error":"unauthorized"}', { status: 401, headers: J });
    const type = (req.headers.get("content-type") || "").split(";")[0].trim();
    if (!/^image\/(jpeg|png|webp)$/.test(type)) return new Response('{"error":"not an image"}', { status: 415, headers: J });
    const buf = await req.arrayBuffer();
    if (buf.byteLength > 4000000) return new Response('{"error":"too large"}', { status: 413, headers: J });
    const id = randomUUID().replace(/-/g, "").slice(0, 24);
    await store.set(id, buf, { metadata: { type } });
    return new Response(JSON.stringify({ url: "/api/photo?id=" + id }), { headers: J });
  }
  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/photo" };
