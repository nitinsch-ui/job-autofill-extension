// Minimal MV3 service worker: seeds a default profile on first install
// and opens the options page so the user is prompted to fill in their info.

importScripts(
  "../shared/constants.js",
  "../shared/schema.js",
  "../shared/storage.js"
);

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason !== "install") return;

  const { [STORAGE_KEY_PROFILE]: existing } = await chrome.storage.local.get(STORAGE_KEY_PROFILE);
  if (!existing) {
    await saveProfile(getDefaultProfile());
  }
  chrome.runtime.openOptionsPage();
});
