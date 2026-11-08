import { createHash, timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";

export const store = getStore("39ers-delights-mobile-orders");

const hash = value => createHash("sha256").update(value).digest("hex");

export async function verifyStoreKey(request, { registerIfMissing = false } = {}) {
  const key = request.headers.get("x-store-key") || "";
  if (key.length < 32 || key.length > 200) return false;

  const presented = hash(key);
  const stored = await store.get("pos-device-key-hash", { type: "text" });

  if (!stored && registerIfMissing) {
    // Only the first POS device can register the shared store key.
    await store.set("pos-device-key-hash", presented, { onlyIfNew: true });
    const registered = await store.get("pos-device-key-hash", { type: "text" });
    return registered === presented;
  }

  if (!stored || stored.length !== presented.length) return false;
  return timingSafeEqual(Buffer.from(stored), Buffer.from(presented));
}

export function json(data, status = 200, extraHeaders = {}) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...extraHeaders },
  });
}
