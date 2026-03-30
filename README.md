# Ghost Pop Crosslister

Chrome extension scaffold for drafting one resale listing and routing it to Depop,
Vinted, Poshmark, and eBay. This project now mirrors the Ghost Pop extension
patterns where that structure is useful: Manifest V3, a background service
worker, popup and options pages, shared storage helpers, and per-platform
content scripts.

## Current scope

- Single-listing draft flow in the popup
- Shared listing model with `xlist_` storage keys
- Background queue in `background/service-worker.js`
- Platform adapters for validation and marketplace-specific transforms
- Content-script placeholders for Depop, Vinted, Poshmark, and eBay
- Options page for queue pacing and eBay beta toggle

## Load the extension

1. Open Chrome and go to `chrome://extensions`
2. Enable Developer mode
3. Click Load unpacked
4. Select `/home/maggie/Repos/doubleghost`

## Notes

- The scaffold is intentionally honest about automation maturity. DOM selectors
  are isolated and easy to patch, but they are not claimed to be production
  ready without live verification.
- Photos are stored in `chrome.storage.local`. Listing metadata is mirrored into
  `chrome.storage.sync` when possible.
