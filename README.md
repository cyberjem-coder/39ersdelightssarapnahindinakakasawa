# 39ers Delights POS — Complete Netlify Project

This is a complete deployable project package with the customer-facing mobile QR ordering improvements and the supplied 39ers Delights jingle.

## Folder layout

```text
.
├── public/
│   ├── index.html
│   ├── reset-pos-device.html
│   └── assets/
│       └── 39ers-delights-jingle.mp3
├── netlify/
│   └── functions/
│       ├── mobile-menu.mjs
│       ├── mobile-orders.mjs
│       └── reset-pos-device.mjs
├── lib/
│   └── store.mjs
├── docs/
│   ├── 39ers_delights_google_sheets_setup_CEO.txt
│   └── 39ers_delights_google_sheets_sync.gs
├── netlify.toml
├── package.json
├── .gitignore
└── README.md
```

The `netlify.toml` publishes `public/` and loads functions from `netlify/functions/`. Keep this folder structure exactly as shown.

## Customer-facing mobile QR improvements

- Sticky checkout summary/button is the first item at the top of the mobile ordering page.
- The selected category gets a gold indicator that slides to the active tab; the active tab also receives a highlighted state.
- The most recently selected item card is visibly highlighted; items already in the tray remain highlighted.
- Category, Dine-In/Takeout, and item selection actions play a short two-tone sound cue.
- The supplied MP3 is loaded from `/assets/39ers-delights-jingle.mp3` and playback is attempted on each QR-page visit.
- If a mobile browser blocks autoplay, the first touch/pointer interaction attempts to start the jingle; a visible Play/Pause control remains available.

**Mobile audio limitation:** iOS Safari and some Android browsers restrict autoplay with sound until a user gesture. A website cannot override that browser policy. The package attempts autoplay, then starts the audio on the first customer interaction and provides an explicit Play jingle control. Actual behavior must be checked on the customer's phone, with media volume on and silent mode off.

## Mobile menu recovery when Netlify briefly returns HTTP 502

The menu endpoint now retries transient storage/network errors and returns a controlled 503 response with an incident ID instead of allowing an unhandled storage exception to become a generic function crash. The customer page retries 502/503/504 responses, keeps the most recently loaded public menu in that customer's browser, and shows a small reconnect notice rather than removing the menu. It retries in the background once per minute.

The cached menu is display-only. Before a customer can submit an order, the page still fetches the current published menu and the mobile-orders function validates availability and stock again. A failed fresh check prevents submission; it never records a sale or deducts inventory.

If this continues, open Netlify → Functions → `mobile-menu` → Logs and look for `[mobile-menu]` plus the incident ID shown in the customer response. The logged exception is needed to identify the underlying storage/platform error. Do not clear the Netlify Blobs store or reset cashier authorization as a response to a menu 502.

## Existing POS and order workflow retained

The full POS page is preserved, with the previously-added Sold Out and mobile ordering controls included. The project retains existing menu/category and variant editing, cart and checkout, VAT, discounts/promotions, receipts, transaction records, inventory, audit and reports, Google Sheets setup/sync files, cashier authorization, QR menu publishing, incoming mobile-order review, and order import.

Mobile-order confirmation continues to import into the POS cart only. It does not complete a sale or deduct inventory. The normal cashier checkout remains the sale-recording and stock-deduction path.

Sold Out behavior included:
- Automatically unavailable when a tracked inventory item reaches zero.
- Manual Sold Out override from the POS inventory controls.
- QR menu shows Sold Out and disables ordering for unavailable items.
- The order API rechecks published Sold Out status and tracked stock before accepting an order.

## Important data and deployment notes

- This ZIP contains application source and the supplied jingle. It does **not** contain live browser localStorage, Netlify Blobs orders, sales history, inventory records, device keys, or secrets.
- Do not clear browser data or delete the existing Netlify Blobs store when deploying this package.
- Keep the existing Google Apps Script deployment and spreadsheet data. The Google Sheets setup and sync source files in `docs/` are included unchanged from the previous project package.
- Existing cashier inventory/sales data remains in the browser profile where the POS has been used. Keep that browser profile and your separate backups.
- Do not commit private tokens or environment-variable values to GitHub. The device-reset function requires `POS_DEVICE_RESET_TOKEN` only when used.

## Upload to an existing GitHub repository

1. Make a backup of the repository and work on the separate `mobile-qr-update` branch, not the production branch.
2. Extract this ZIP on your computer. Upload the **contents** of the extracted folder to the repository root, preserving the paths shown in the folder layout above. Do not upload the ZIP itself, and do not upload the containing parent folder as an extra nested directory.
3. If the repository already has root-level files such as `index.html`, `mobile-menu.mjs`, `mobile-orders.mjs`, `store.mjs`, or `reset-pos-device.mjs`, leave them in place. The Netlify configuration uses the correctly located `public/`, `netlify/functions/`, and `lib/` copies.
4. Keep `netlify.toml` at repository root. It should contain:

   ```toml
   [build]
     publish = "public"
     functions = "netlify/functions"

   [functions]
     node_bundler = "esbuild"
   ```

5. If GitHub prompts about an existing same-named root file, do not guess. Check that `netlify.toml` matches the block above and that `package.json` includes `@netlify/blobs`. Keep the repository backup before committing changes.
6. Create a pull request from `mobile-qr-update` into the production branch and use a Netlify Deploy Preview first, if Deploy Previews are enabled. Do not merge until the POS, mobile menu, order submission, Sold Out behavior, and jingle have been checked.

## Before going live

Test with a real phone:
- QR opens the customer order page and menu loads.
- Checkout bar is at the very top and remains visible when scrolling.
- Gold category indicator visibly moves when another category is selected.
- Selected product card visibly highlights when a variant is tapped.
- Tap feedback sound is audible.
- Jingle starts automatically where the phone permits it, or starts on the first touch / Play jingle tap.
- Sold Out items cannot be added or submitted.
- A test order reaches the cashier queue; confirming imports it into the cart only.
- A normal test checkout records the sale and updates tracked stock as expected.

This package has passed static syntax and archive-integrity checks in the local build environment. It has not been deployed to the user's Netlify site or tested on the user's actual phone.
