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

export async function getSettings() {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.settings);
  return {
    ...DEFAULT_SETTINGS,
    ...(stored[STORAGE_KEYS.settings] || {})
  };
}

export async function setSettings(nextSettings) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.settings]: nextSettings
  });
  return nextSettings;
}

export async function saveListing(listing) {
  const nextListing = {
    ...listing,
    updatedAt: Date.now()
  };

  await chrome.storage.local.set({
    [getListingKey(nextListing.id)]: nextListing
  });

  try {
    await chrome.storage.sync.set({
      [getListingKey(nextListing.id)]: {
        ...nextListing,
        photos: []
      }
    });
  } catch (error) {
    console.warn("sync mirror failed", error);
  }

  return nextListing;
}

export async function getListing(id) {
  const stored = await chrome.storage.local.get(getListingKey(id));
  return stored[getListingKey(id)] || null;
}

export async function getAllListings() {
  const all = await chrome.storage.local.get(null);
  return Object.entries(all)
    .filter(([key]) => key.startsWith("xlist_listing_"))
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
