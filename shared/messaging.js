export const MESSAGE_TYPES = {
  getState: "GET_STATE",
  saveListing: "SAVE_LISTING",
  enqueueListing: "ENQUEUE_LISTING",
  updateSettings: "UPDATE_SETTINGS",
  fillListing: "FILL_LISTING",
  submitListing: "SUBMIT_LISTING"
};

export function sendRuntimeMessage(type, payload = {}) {
  return chrome.runtime.sendMessage({ type, ...payload });
}

export function sendTabMessage(tabId, type, payload = {}) {
  return chrome.tabs.sendMessage(tabId, { type, ...payload });
}
