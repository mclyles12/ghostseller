import { MESSAGE_TYPES, sendRuntimeMessage } from "../shared/messaging.js";

const form = document.querySelector("#settingsForm");
const status = document.querySelector("#status");

initialize().catch((error) => {
  status.textContent = error.message || "Failed to load settings.";
});

async function initialize() {
  const state = await sendRuntimeMessage(MESSAGE_TYPES.getState);
  form.queueIntervalMinutes.value = state.settings.queueIntervalMinutes;
  form.ebayBetaEnabled.checked = Boolean(state.settings.ebayBetaEnabled);
  form.autoSubmit.checked = Boolean(state.settings.autoSubmit);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const result = await sendRuntimeMessage(MESSAGE_TYPES.updateSettings, {
    settings: {
      queueIntervalMinutes: Number(form.queueIntervalMinutes.value),
      ebayBetaEnabled: form.ebayBetaEnabled.checked,
      autoSubmit: form.autoSubmit.checked
    }
  });

  status.textContent = `Saved. Queue interval is ${result.settings.queueIntervalMinutes} minute(s).`;
});
