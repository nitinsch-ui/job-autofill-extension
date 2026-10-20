const CONTENT_SCRIPT_FILES = [
  "content/field-dictionary.js",
  "content/field-matcher.js",
  "content/fill-engine.js",
  "content/content-script.js"
];

function setStatus(text, type) {
  const el = document.getElementById("status");
  el.textContent = text;
  el.className = "status " + (type || "");
}

function displayResult(result) {
  if (!result) {
    setStatus("No response from the page. Try reloading it.", "error");
    return;
  }
  if (result.error) {
    setStatus(result.error, "error");
    return;
  }
  let msg = `Filled ${result.filledCount} field${result.filledCount !== 1 ? "s" : ""}.`;
  if (result.skippedFileCount) {
    msg += ` ${result.skippedFileCount} file upload${result.skippedFileCount > 1 ? "s" : ""} skipped — attach manually.`;
  }
  msg += " Review before submitting.";
  setStatus(msg, "success");
}

async function handleFillClick() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    setStatus("No active tab found.", "error");
    return;
  }

  setStatus("Filling…", "pending");

  try {
    const result = await chrome.tabs.sendMessage(tab.id, { type: "FILL_PAGE" });
    displayResult(result);
  } catch (e) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: CONTENT_SCRIPT_FILES
      });
      const result = await chrome.tabs.sendMessage(tab.id, { type: "FILL_PAGE" });
      displayResult(result);
    } catch (e2) {
      setStatus("Could not run on this page. Try reloading the page first.", "error");
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("fillBtn").addEventListener("click", handleFillClick);
  document.getElementById("optionsBtn").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
});
