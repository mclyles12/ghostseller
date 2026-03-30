import {
  DEFAULT_SETTINGS,
  appendLog,
  createEmptyListing,
  getAllListings,
  getListing,
  getLog,
  getQueue,
  getSettings,
  saveListing,
  setQueue,
  setSettings
} from "../shared/storage.js";
import { MESSAGE_TYPES } from "../shared/messaging.js";
import { validateListing } from "../shared/platform-adapter.js";

const ALARM_NAME = "ghostpop-crosslister-queue";
const MAX_RETRIES = 2;
const PLATFORM_CONFIG = {
  depop: {
    origin: "https://www.depop.com",
    createUrl: "https://www.depop.com/sell"
  },
  vinted: {
    origin: "https://www.vinted.com",
    createUrl: "https://www.vinted.com/items/new"
  },
  poshmark: {
    origin: "https://poshmark.com",
    createUrl: "https://poshmark.com/create-listing"
  },
  ebay: {
    origin: "https://www.ebay.com",
    createUrl: "https://www.ebay.com/sl/sell"
  }
};

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(["ghostpop_settings", "ghostpop_log", "xlist_queue"]);
  await chrome.storage.local.set({
    ghostpop_settings: {
      ...DEFAULT_SETTINGS,
      ...(existing.ghostpop_settings || {})
    },
    ghostpop_log: existing.ghostpop_log || [],
    xlist_queue: existing.xlist_queue || []
  });

  const listings = await getAllListings();
  if (!listings.length) {
    await saveListing(createEmptyListing());
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  await processNextJob();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch(async (error) => {
      console.error(error);
      await appendLog(error.message || "Unexpected error", "error");
      sendResponse({ ok: false, error: error.message || "Unexpected error" });
    });

  return true;
});

async function handleMessage(message) {
  switch (message.type) {
    case MESSAGE_TYPES.getState:
      return {
        ok: true,
        listings: await getAllListings(),
        queue: await getQueue(),
        settings: await getSettings(),
        log: await getLog()
      };
    case MESSAGE_TYPES.saveListing: {
      const listing = await saveListing(message.listing);
      await appendLog(`Saved draft ${listing.title || listing.id}`);
      return { ok: true, listing };
    }
    case MESSAGE_TYPES.enqueueListing:
      await enqueueListing(message.listingId, message.platforms || []);
      return { ok: true };
    case MESSAGE_TYPES.updateSettings: {
      const current = await getSettings();
      const merged = await setSettings({ ...current, ...message.settings });
      await scheduleQueueAlarm(merged.queueIntervalMinutes);
      return { ok: true, settings: merged };
    }
    default:
      return { ok: false, error: `Unknown message type: ${message.type}` };
  }
}

async function enqueueListing(listingId, platforms) {
  const listing = await getListing(listingId);
  if (!listing) {
    throw new Error("Listing not found.");
  }

  const queue = await getQueue();
  const settings = await getSettings();
  let queuedCount = 0;

  for (const platform of platforms) {
    if (platform === "ebay" && !settings.ebayBetaEnabled) {
      await appendLog("Skipped eBay queue request because eBay beta is disabled in settings.", "warning");
      continue;
    }

    const validation = validateListing(listing, platform);
    if (!validation.valid) {
      await appendLog(`Cannot queue ${platform}: ${validation.errors.join(" ")}`, "error");
      continue;
    }

    queue.push({
      id: crypto.randomUUID(),
      listingId,
      platform,
      attempts: 0,
      status: "pending",
      createdAt: Date.now()
    });

    listing.platforms[platform] = {
      ...listing.platforms[platform],
      status: "pending"
    };
    queuedCount += 1;
  }

  await saveListing(listing);
  await setQueue(queue);
  await scheduleQueueAlarm((await getSettings()).queueIntervalMinutes);
  await appendLog(`Queued ${queuedCount} job(s) for ${listing.title || listing.id}`);
}

async function scheduleQueueAlarm(delayInMinutes) {
  await chrome.alarms.clear(ALARM_NAME);
  await chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: Math.max(1, Number(delayInMinutes) || 1)
  });
}

async function processNextJob() {
  const queue = await getQueue();
  if (!queue.length) return;

  const nextJob = queue[0];
  const listing = await getListing(nextJob.listingId);
  const settings = await getSettings();

  if (!listing) {
    queue.shift();
    await setQueue(queue);
    await appendLog(`Dropped orphaned job ${nextJob.id}`, "warning");
    return;
  }

  try {
    listing.platforms[nextJob.platform] = {
      ...listing.platforms[nextJob.platform],
      status: "posting"
    };
    await saveListing(listing);
    await appendLog(`Posting ${listing.title || listing.id} to ${nextJob.platform}`);
    const tab = await getOrCreatePlatformTab(nextJob.platform);
    const fillResult = await chrome.tabs.sendMessage(tab.id, {
      type: MESSAGE_TYPES.fillListing,
      listing
    });

    if (!fillResult?.ok) {
      throw new Error(fillResult?.error || `Failed to fill ${nextJob.platform} form.`);
    }

    if (fillResult.warning) {
      await appendLog(fillResult.warning, "warning");
    }

    if (settings.autoSubmit) {
      const submitResult = await chrome.tabs.sendMessage(tab.id, {
        type: MESSAGE_TYPES.submitListing
      });

      if (!submitResult?.ok) {
        throw new Error(submitResult?.error || `Failed to submit ${nextJob.platform} form.`);
      }

      listing.platforms[nextJob.platform] = {
        ...listing.platforms[nextJob.platform],
        status: "live",
        url: tab.url || PLATFORM_CONFIG[nextJob.platform].origin,
        listedAt: Date.now()
      };
      await appendLog(`Submitted ${listing.title || listing.id} to ${nextJob.platform}`);
    } else {
      listing.platforms[nextJob.platform] = {
        ...listing.platforms[nextJob.platform],
        status: "pending",
        url: tab.url || PLATFORM_CONFIG[nextJob.platform].origin
      };
      await appendLog(`Filled ${nextJob.platform} form for review in the open tab.`);
    }

    queue.shift();
    await saveListing(listing);
    await setQueue(queue);
  } catch (error) {
    nextJob.attempts += 1;

    if (nextJob.attempts > MAX_RETRIES) {
      queue.shift();
      listing.platforms[nextJob.platform] = {
        ...listing.platforms[nextJob.platform],
        status: "failed"
      };
      await appendLog(`Job failed for ${nextJob.platform}: ${error.message}`, "error");
    } else {
      queue[0] = nextJob;
      listing.platforms[nextJob.platform] = {
        ...listing.platforms[nextJob.platform],
        status: "pending"
      };
      await appendLog(`Retry ${nextJob.attempts} scheduled for ${nextJob.platform}`, "warning");
    }

    await saveListing(listing);
    await setQueue(queue);
  }
}

async function getOrCreatePlatformTab(platform) {
  const config = PLATFORM_CONFIG[platform];
  if (!config) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  const matchingTabs = await chrome.tabs.query({
    url: `${config.origin}/*`
  });
  const existingTab = matchingTabs.find((tab) => tab.id);

  const tab = existingTab
    ? await chrome.tabs.update(existingTab.id, { active: true })
    : await chrome.tabs.create({ url: config.createUrl, active: true });

  if (!existingTab) {
    await waitForTabComplete(tab.id);
  } else if (tab.status !== "complete") {
    await waitForTabComplete(tab.id);
  }

  return tab;
}

function waitForTabComplete(tabId) {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(async () => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      resolve(await chrome.tabs.get(tabId));
    }, 15000);

    async function onUpdated(updatedTabId, changeInfo) {
      if (updatedTabId !== tabId || changeInfo.status !== "complete") {
        return;
      }

      clearTimeout(timeoutId);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      resolve(await chrome.tabs.get(tabId));
    }

    chrome.tabs.onUpdated.addListener(onUpdated);
  });
}
