import { store, verifyStoreKey, json } from "../../lib/store.mjs";

function cleanMenu(input) {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 1000).map(row => {
    const stockTracked = row?.stockTracked === true;
    const rawStockQuantity = Number(row?.stockQuantity);
    // Fail closed for a tracked item with an invalid quantity rather than making it orderable.
    const stockQuantity = stockTracked
      ? (Number.isInteger(rawStockQuantity) && rawStockQuantity >= 0 ? rawStockQuantity : 0)
      : null;
    const manualSoldOut = row?.manualSoldOut === true;
    const isSoldOut = manualSoldOut || (stockTracked && stockQuantity === 0) || row?.isSoldOut === true;
    return {
      itemId: String(row?.itemId ?? row?.id ?? "").slice(0, 120),
      itemName: String(row?.itemName ?? row?.title ?? "").slice(0, 200),
      category: String(row?.category ?? "").slice(0, 120),
      icon: String(row?.icon ?? "").slice(0, 80),
      stockTracked,
      stockQuantity,
      manualSoldOut,
      isSoldOut,
      variants: (Array.isArray(row?.variants) ? row.variants : []).slice(0, 30)
        .map(v => ({
          name: String(v?.name ?? "Regular").slice(0, 120),
          price: Number(v?.price) || 0,
        }))
        .filter(v => Number.isFinite(v.price) && v.price > 0 && v.price <= 100000),
    };
  }).filter(item => item.itemId && item.itemName && item.variants.length);
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// Blobs requests can occasionally fail during a function cold start or transient
// platform/network interruption. A short bounded retry avoids exposing a single
// temporary read failure to every customer opening the QR menu.
async function readPublishedMenuWithRetry() {
  let lastError;
  const delays = [0, 250, 650];
  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt]) await wait(delays[attempt]);
    try {
      return await store.get("customer-menu", { type: "json" });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function handleRequest(request) {
  if (request.method === "GET") {
    const saved = await readPublishedMenuWithRetry();
    return json({ ok: true, menu: Array.isArray(saved?.menu) ? saved.menu : [], updatedAt: saved?.updatedAt ?? null });
  }

  if (request.method === "PUT") {
    if (!(await verifyStoreKey(request, { registerIfMissing: true }))) {
      return json({ ok: false, message: "This POS device is not authorized to publish the menu." }, 403);
    }
    let body;
    try { body = await request.json(); }
    catch { return json({ ok: false, message: "Invalid JSON request." }, 400); }

    const menu = cleanMenu(body?.menu);
    if (!menu.length) return json({ ok: false, message: "The POS menu is empty or has no valid priced variants." }, 400);

    const updatedAt = new Date().toISOString();
    await store.setJSON("customer-menu", { menu, updatedAt });
    return json({ ok: true, count: menu.length, updatedAt });
  }

  return json({ ok: false, message: "Method not allowed." }, 405, { Allow: "GET, PUT" });
}

export default async function handler(request) {
  try {
    return await handleRequest(request);
  } catch (error) {
    const incidentId = `menu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    // Keep the underlying exception in Netlify Function logs for diagnosis,
    // but do not expose internal details to customers.
    console.error(`[mobile-menu] ${incidentId} ${request.method} failed`, error?.stack || error);
    return json({
      ok: false,
      code: "MENU_SERVICE_TEMPORARILY_UNAVAILABLE",
      message: "The menu service is temporarily unavailable. Please try again in a moment.",
      incidentId,
    }, 503, { "Retry-After": "3" });
  }
}

export const config = { path: "/api/mobile-menu", method: ["GET", "PUT"] };
