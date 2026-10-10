import { getStore } from "@netlify/blobs";
import { timingSafeEqual } from "node:crypto";

const JSON_H = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
};

function isAdmin(req) {
  const real = process.env.ADMIN_KEY || "";
  const got = req.headers.get("x-admin-key") || "";
  if (real.length < 8 || real.length !== got.length) return false;
  return timingSafeEqual(Buffer.from(real), Buffer.from(got));
}

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...JSON_H,
        "access-control-allow-headers": "content-type,x-admin-key",
        "access-control-allow-methods": "GET,POST,OPTIONS",
      },
    });
  }
  const store = getStore("catalog");
  if (req.method === "GET") {
    const data = await store.get("data", { type: "json" });
    return new Response(JSON.stringify(data || {}), { headers: JSON_H });
  }
  if (req.method === "POST") {
    if (!isAdmin(req)) return new Response('{"error":"unauthorized"}', { status: 401, headers: JSON_H });
    let body;
    try { body = await req.json(); } catch { body = null; }
    if (!body || !Array.isArray(body.items)) return new Response('{"error":"bad request"}', { status: 400, headers: JSON_H });
    await store.setJSON("data", {
      items: body.items,
      testi: Array.isArray(body.testi) ? body.testi : [],
      look: body.look && typeof body.look === "object" ? body.look : {},
      updated: Number(body.updated) || Date.now(),
    });
    return new Response('{"ok":true}', { headers: JSON_H });
  }
  return new Response("Method not allowed", { status: 405, headers: JSON_H });
};

export const config = { path: "/api/catalog" };
