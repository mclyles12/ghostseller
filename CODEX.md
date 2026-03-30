# Ghost Pop Crosslister — Codex context

## What this is
A Chrome extension (Manifest V3) that cross-lists resale items across Depop,
Vinted, Poshmark, and eBay from a single form. It is a sibling extension to
Ghost Pop Listing Renewer.

## Shared conventions with Ghost Pop
- Storage namespace prefix: `ghostpop_` for shared settings, `xlist_` for listings
- Same Chrome Alarms API pattern for pacing (minimum 1-minute intervals)
- Same message passing pattern: popup -> service worker -> content script
- Visual tokens in `shared/tokens.css` mirror Ghost Pop's core design language

## Architecture rules
1. Background service worker manages all async work. Popup is UI only.
2. Content scripts are injected per-domain and do DOM filling only.
3. Each platform has its own content script. No shared DOM logic between platforms.
4. Photos are stored as base64 in `chrome.storage.local`.
5. Listing metadata is mirrored into `chrome.storage.sync`.

## Platform adapter pattern
Every adapter in `shared/platform-adapter.js` exposes:
- `mapCondition(condition, platform)`
- `mapCategory(category, platform)`
- `buildHashtags(tags, platform)`
- `validateListing(listing, platform)`

## Content script contract
Each file in `content/` handles:
- `{ type: "FILL_LISTING", listing }`
- `{ type: "SUBMIT_LISTING" }`

Use human-speed delays before submit actions.
