import { saveListing, getAllListings, getQueue, setQueue, getLog, setLog } from "./storage.js";

export const MESSAGE_TYPES = {
  getState: "GET_STATE",
  saveListing: "SAVE_LISTING",
  enqueueListing: "ENQUEUE_LISTING",
  updateSettings: "UPDATE_SETTINGS",
  fillListing: "FILL_LISTING",
  submitListing: "SUBMIT_LISTING"
};

export async function sendRuntimeMessage(type, payload = {}) {
  switch (type) {
    case MESSAGE_TYPES.getState:
      return await handleGetState();
    case MESSAGE_TYPES.saveListing:
      return await handleSaveListing(payload);
    case MESSAGE_TYPES.enqueueListing:
      return await handleEnqueueListing(payload);
    default:
      throw new Error(`Unknown message type: ${type}`);
  }
}

async function handleGetState() {
  const listings = getAllListings();
  const queue = await getQueue();
  const log = await getLog();
  return { listings, queue, log };
}

async function handleSaveListing({ listing }) {
  const saved = saveListing(listing);
  return { listing: saved };
}

async function handleEnqueueListing({ listingId, platforms }) {
  const queue = await getQueue();
  const log = await getLog();
  // Simulate enqueuing
  for (const platform of platforms) {
    queue.push({ listingId, platform, status: "queued" });
    log.push({ timestamp: Date.now(), message: `Queued ${platform} for listing ${listingId}` });
  }
  await setQueue(queue);
  await setLog(log);
  return {};
}

export function sendTabMessage(tabId, type, payload = {}) {
  // Not applicable for web
}
