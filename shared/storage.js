// Thin wrapper over chrome.storage.local for the profile object.
// Depends on shared/constants.js (STORAGE_KEY_PROFILE) and shared/schema.js (getDefaultProfile, migrateProfile).

function getProfile() {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY_PROFILE, (result) => {
      const profile = result[STORAGE_KEY_PROFILE];
      resolve(profile ? migrateProfile(profile) : getDefaultProfile());
    });
  });
}

function saveProfile(profile) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY_PROFILE]: profile }, resolve);
  });
}
