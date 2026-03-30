const SELECTORS = {
  titleInput: 'input[name="title"]',
  descriptionInput: 'textarea[name="description"]',
  priceInput: 'input[name="originalPrice"], input[name="listingPrice"]',
  photoUpload: 'input[type="file"]',
  submitButton: 'button[type="submit"]'
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const humanDelay = () => delay(800 + Math.random() * 1600);
const nativeInputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
const nativeTextAreaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true;
});

async function handleMessage(message) {
  switch (message.type) {
    case "FILL_LISTING":
      return fillListing(message.listing);
    case "SUBMIT_LISTING":
      return submitListing();
    default:
      return { ok: false, error: "Unsupported message" };
  }
}

async function fillListing(listing) {
  const titleInput = document.querySelector(SELECTORS.titleInput);
  const descriptionInput = document.querySelector(SELECTORS.descriptionInput);
  const priceInput = document.querySelector(SELECTORS.priceInput);
  const photoUpload = document.querySelector(SELECTORS.photoUpload);

  if (!titleInput || !descriptionInput || !priceInput) {
    return { ok: false, error: "Poshmark form fields not found." };
  }

  for (const [element, value] of [
    [titleInput, listing.title || ""],
    [descriptionInput, listing.description || ""],
    [priceInput, listing.price.poshmark || ""]
  ]) {
    setFieldValue(element, value);
  }

  if (photoUpload && listing.photos?.length) {
    await injectPhotos(listing.photos, photoUpload);
  }

  return {
    ok: true,
    warning: "Poshmark drag-and-drop uploads and category selectors still need live DOM work."
  };
}

async function submitListing() {
  const submitButton = document.querySelector(SELECTORS.submitButton);
  if (!submitButton) {
    return { ok: false, error: "Poshmark submit button not found." };
  }

  await humanDelay();
  submitButton.click();
  return { ok: true };
}

function setFieldValue(element, value) {
  const setter = element instanceof HTMLTextAreaElement ? nativeTextAreaSetter : nativeInputSetter;
  setter?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

async function injectPhotos(base64Array, fileInput) {
  const files = await Promise.all(
    base64Array.map(async (base64, index) => {
      const response = await fetch(base64);
      const blob = await response.blob();
      return new File([blob], `poshmark_photo_${index + 1}.jpg`, { type: blob.type || "image/jpeg" });
    })
  );

  const dataTransfer = new DataTransfer();
  files.forEach((file) => dataTransfer.items.add(file));
  fileInput.files = dataTransfer.files;
  fileInput.dispatchEvent(new Event("change", { bubbles: true }));
}
