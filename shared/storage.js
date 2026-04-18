export const STORAGE_KEYS = {
  settings: "ghostpop_settings",
  log: "ghostpop_log",
  queue: "xlist_queue"
};

export const DEFAULT_SETTINGS = {
  queueIntervalMinutes: 1,
  ebayBetaEnabled: false,
  autoSubmit: false
};

export function createListingId() {
  return crypto.randomUUID();
}

export function createEmptyListing() {
  const now = Date.now();
  return {
    id: createListingId(),
    title: "",
    description: "",
    price: {
      depop: "",
      vinted: "",
      poshmark: "",
      ebay: ""
    },
    condition: "good",
    category: {
      depop: "",
      vinted: "",
      poshmark: "",
      ebay: ""
    },
    photos: [],
    hashtags: [],
    platforms: {
      depop: { status: "idle", url: "", listedAt: null },
      vinted: { status: "idle", url: "", listedAt: null },
      poshmark: { status: "idle", url: "", listedAt: null },
      ebay: { status: "idle", url: "", listedAt: null }
    },
    createdAt: now,
    updatedAt: now
  };
}

export function getListingKey(id) {
  return `xlist_listing_${id}`;
}

export function getSettings() {
  const stored = localStorage.getItem(STORAGE_KEYS.settings);
  return {
    ...DEFAULT_SETTINGS,
    ...(stored ? JSON.parse(stored) : {})
  };
}

export function setSettings(nextSettings) {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(nextSettings));
  return nextSettings;
}

export function saveListing(listing) {
  const nextListing = {
    ...listing,
    updatedAt: Date.now()
  };

  localStorage.setItem(getListingKey(nextListing.id), JSON.stringify(nextListing));

  // For web, no sync mirror
  return nextListing;
}

export function getListing(id) {
  const stored = localStorage.getItem(getListingKey(id));
  return stored ? JSON.parse(stored) : null;
}

export function getAllListings() {
  const listings = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith("xlist_listing_")) {
      const stored = localStorage.getItem(key);
      if (stored) {
        listings.push(JSON.parse(stored));
      }
    }
  }
  return listings;
}

export async function getQueue() {
  const stored = localStorage.getItem(STORAGE_KEYS.queue);
  return stored ? JSON.parse(stored) : [];
}

export async function setQueue(queue) {
  localStorage.setItem(STORAGE_KEYS.queue, JSON.stringify(queue));
}

export async function getLog() {
  const stored = localStorage.getItem(STORAGE_KEYS.log);
  return stored ? JSON.parse(stored) : [];
}

export async function setLog(log) {
  localStorage.setItem(STORAGE_KEYS.log, JSON.stringify(log));
}
    .map(([, value]) => value)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getQueue() {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.queue);
  return stored[STORAGE_KEYS.queue] || [];
}

export async function setQueue(queue) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.queue]: queue
  });
  return queue;
}

export async function appendLog(message, level = "info") {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.log);
  const next = [
    {
      id: crypto.randomUUID(),
      message,
      level,
      timestamp: Date.now()
    },
    ...(stored[STORAGE_KEYS.log] || [])
  ].slice(0, 100);

  await chrome.storage.local.set({
    [STORAGE_KEYS.log]: next
  });

  return next;
}

export async function getLog() {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.log);
  return stored[STORAGE_KEYS.log] || [];
}
