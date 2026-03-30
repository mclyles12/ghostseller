import { createEmptyListing } from "../shared/storage.js";
import { MESSAGE_TYPES, sendRuntimeMessage } from "../shared/messaging.js";

const form = document.querySelector("#listingForm");
const newDraftButton = document.querySelector("#newDraftBtn");
const queueButton = document.querySelector("#queueBtn");
const logList = document.querySelector("#logList");
const queueCount = document.querySelector("#queueCount");
const statusText = document.querySelector("#statusText");
const draftSelect = document.querySelector("#draftSelect");
const draftMeta = document.querySelector("#draftMeta");

let currentListing = null;
let currentListings = [];

initialize().catch((error) => {
  console.error(error);
  statusText.textContent = error.message || "Failed to initialize popup.";
});

async function initialize() {
  await refreshState();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveCurrentListing();
});

queueButton.addEventListener("click", async () => {
  const listing = await saveCurrentListing();
  const platforms = getSelectedPlatforms();
  await sendRuntimeMessage(MESSAGE_TYPES.enqueueListing, {
    listingId: listing.id,
    platforms
  });

  await refreshState(listing.id);
  statusText.textContent = `Queued ${platforms.join(", ") || "no"} platform jobs.`;
});

newDraftButton.addEventListener("click", () => {
  currentListing = createEmptyListing();
  populateForm(currentListing);
  renderDraftMeta(currentListing);
  statusText.textContent = "New draft created locally. Save when ready.";
});

draftSelect.addEventListener("change", async () => {
  const selectedId = draftSelect.value;
  const selectedListing = currentListings.find((listing) => listing.id === selectedId);
  if (!selectedListing) {
    return;
  }

  currentListing = selectedListing;
  populateForm(currentListing);
  renderDraftMeta(currentListing);
  statusText.textContent = `Loaded draft ${currentListing.title || currentListing.id}`;
});

async function saveCurrentListing() {
  const listing = await buildListingFromForm();
  const result = await sendRuntimeMessage(MESSAGE_TYPES.saveListing, { listing });
  currentListing = result.listing;
  await refreshState(currentListing.id);
  statusText.textContent = `Saved ${currentListing.title || currentListing.id}`;
  return currentListing;
}

async function buildListingFromForm() {
  const fileInput = document.querySelector("#photos");
  const nextPhotos = fileInput.files?.length
    ? await Promise.all(Array.from(fileInput.files).map(fileToDataUrl))
    : currentListing?.photos || [];

  return {
    ...(currentListing || createEmptyListing()),
    title: form.title.value.trim(),
    description: form.description.value.trim(),
    condition: form.condition.value,
    price: {
      depop: form.priceDepop.value,
      vinted: form.priceVinted.value,
      poshmark: form.pricePoshmark.value,
      ebay: form.priceEbay.value
    },
    category: {
      depop: form.categoryDepop.value.trim(),
      vinted: form.categoryVinted.value.trim(),
      poshmark: form.categoryPoshmark.value.trim(),
      ebay: form.categoryEbay.value.trim()
    },
    photos: nextPhotos,
    hashtags: form.hashtags.value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
  };
}

function populateForm(listing) {
  form.title.value = listing.title || "";
  form.description.value = listing.description || "";
  form.condition.value = listing.condition || "good";
  form.priceDepop.value = listing.price?.depop || "";
  form.priceVinted.value = listing.price?.vinted || "";
  form.pricePoshmark.value = listing.price?.poshmark || "";
  form.priceEbay.value = listing.price?.ebay || "";
  form.categoryDepop.value = listing.category?.depop || "";
  form.categoryVinted.value = listing.category?.vinted || "";
  form.categoryPoshmark.value = listing.category?.poshmark || "";
  form.categoryEbay.value = listing.category?.ebay || "";
  form.hashtags.value = (listing.hashtags || []).join(", ");
  document.querySelector("#photos").value = "";
}

function getSelectedPlatforms() {
  return Array.from(document.querySelectorAll('input[name="platform"]:checked')).map((input) => input.value);
}

function renderQueue(queue) {
  queueCount.textContent = `${queue.length} queued`;
}

function renderLog(entries) {
  logList.innerHTML = "";

  if (!entries.length) {
    logList.innerHTML = '<div class="log-item">No activity yet.</div>';
    return;
  }

  for (const entry of entries.slice(0, 8)) {
    const item = document.createElement("div");
    item.className = "log-item";
    item.textContent = `${new Date(entry.timestamp).toLocaleTimeString()} ${entry.message}`;
    logList.appendChild(item);
  }
}

function renderDraftOptions(listings, selectedId) {
  draftSelect.innerHTML = "";

  for (const listing of listings) {
    const option = document.createElement("option");
    option.value = listing.id;
    option.textContent = listing.title?.trim() || `Untitled ${listing.id.slice(0, 8)}`;
    option.selected = listing.id === selectedId;
    draftSelect.appendChild(option);
  }

  if (!listings.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No saved drafts";
    draftSelect.appendChild(option);
  }
}

function renderDraftMeta(listing) {
  const photos = listing.photos?.length || 0;
  const updated = listing.updatedAt ? new Date(listing.updatedAt).toLocaleString() : "not saved yet";
  draftMeta.textContent = `${photos} photo${photos === 1 ? "" : "s"} saved. Updated ${updated}.`;
}

async function refreshState(preferredListingId = currentListing?.id) {
  const state = await sendRuntimeMessage(MESSAGE_TYPES.getState);
  currentListings = state.listings;
  const selectedListing =
    currentListings.find((listing) => listing.id === preferredListingId) ||
    currentListings[0] ||
    createEmptyListing();

  currentListing = selectedListing;
  renderDraftOptions(currentListings, currentListing.id);
  populateForm(currentListing);
  renderDraftMeta(currentListing);
  renderLog(state.log);
  renderQueue(state.queue);
  statusText.textContent = `Loaded draft ${currentListing.title || currentListing.id}`;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("Failed to read file."));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}
