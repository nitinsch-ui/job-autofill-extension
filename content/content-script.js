// Main orchestration: enumerate fields, match against the stored profile (plus any
// learned free-text answers), fill them, handle radio groups as units, retry for
// late-mounted fields via MutationObserver, and respond to messages from the popup.
// Depends on field-dictionary.js, field-matcher.js, fill-engine.js (loaded before this file).

const alreadyFilled = new WeakSet();

function resolveValue(profile, schemaPath) {
  return schemaPath.split(".").reduce((obj, key) => (obj ? obj[key] : undefined), profile);
}

function resolveMatchValue(profile, match) {
  if (match.kind === "learned") {
    const entry = (profile.learnedAnswers || []).find((e) => e.id === match.learnedId);
    return entry ? entry.value : undefined;
  }
  return resolveValue(profile, match.schemaPath);
}

function isDemographicPath(schemaPath) {
  return schemaPath.startsWith("demographics.");
}

function groupKeyFor(el) {
  const formId = el.form ? el.form.id || "form" : "noform";
  return `${formId}::${el.name}`;
}

function fillPage(profile) {
  const fields = enumerateFillableFields();
  const learnedAnswers = profile.learnedAnswers || [];
  let filledCount = 0;
  let skippedFileCount = 0;
  let skippedDemoCount = 0;

  const radioGroups = {};
  fields.forEach((el) => {
    if (el.type === "radio" && el.name) {
      const key = groupKeyFor(el);
      (radioGroups[key] = radioGroups[key] || []).push(el);
    }
  });
  const handledRadioGroups = new Set();

  for (const el of fields) {
    if (el.disabled || el.readOnly) continue;
    if (alreadyFilled.has(el)) continue;

    if (el.type === "file") {
      skippedFileCount++;
      continue;
    }

    if (el.type === "radio") {
      const key = groupKeyFor(el);
      if (handledRadioGroups.has(key)) continue;
      handledRadioGroups.add(key);

      const group = radioGroups[key];
      const match = matchField(group[0], learnedAnswers);
      if (!match) continue;
      if (match.kind === "schema" && isDemographicPath(match.schemaPath) && profile.demographics.optOut) {
        skippedDemoCount++;
        continue;
      }
      const value = resolveMatchValue(profile, match);
      if (!value) continue;

      const ok = fillRadioGroup(group, value);
      if (ok) {
        group.forEach((r) => alreadyFilled.add(r));
        filledCount++;
      }
      continue;
    }

    const match = matchField(el, learnedAnswers);
    if (!match) continue;
    if (match.kind === "schema" && isDemographicPath(match.schemaPath) && profile.demographics.optOut) {
      skippedDemoCount++;
      continue;
    }
    const value = resolveMatchValue(profile, match);
    if (value === undefined || value === null || value === "") continue;

    const ok = applyValue(el, value);
    if (ok) {
      alreadyFilled.add(el);
      filledCount++;
    }
  }

  return {
    filledCount,
    skippedFileCount,
    skippedDemoCount,
    totalCandidates: fields.length
  };
}

// Finds text/textarea fields the user has typed an answer into that the matcher
// could not explain via the schema dictionary OR a previously learned answer —
// i.e. genuinely new free-text questions worth remembering for next time.
function pickBestSignalText(signals) {
  const order = ["labelFor", "labelWrapping", "ariaLabel", "ariaLabelledBy", "legendText", "placeholder", "nearbyText"];
  for (const key of order) {
    if (signals[key]) return signals[key];
  }
  return "";
}

function scanForNewAnswers(profile) {
  const fields = enumerateFillableFields();
  const learnedAnswers = profile.learnedAnswers || [];
  const seenQuestions = new Set();
  const candidates = [];

  for (const el of fields) {
    if (el.disabled || el.readOnly) continue;
    const isTextLike = el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && (el.type === "text" || el.type === ""));
    if (!isTextLike) continue;

    const value = el.value && el.value.trim();
    if (!value) continue;

    const signals = extractSignals(el);
    if (isDenylisted(signals)) continue;

    const match = matchField(el, learnedAnswers);
    if (match) continue; // already explained by the dictionary or a prior learned answer

    const questionText = pickBestSignalText(signals);
    if (!questionText) continue;

    const normQuestion = normalize(questionText);
    if (seenQuestions.has(normQuestion)) continue;
    seenQuestions.add(normQuestion);

    candidates.push({ questionText, value });
  }

  return candidates;
}

function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

let activeObserver = null;
let observerTimeoutId = null;

function startMutationRetry(profile) {
  if (activeObserver) return; // already running

  activeObserver = new MutationObserver(
    debounce(() => {
      fillPage(profile);
    }, 400)
  );
  activeObserver.observe(document.body, { childList: true, subtree: true });

  observerTimeoutId = setTimeout(() => {
    if (activeObserver) {
      activeObserver.disconnect();
      activeObserver = null;
    }
  }, 8000);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FILL_PAGE") {
    chrome.storage.local.get("profile", ({ profile }) => {
      if (!profile) {
        sendResponse({ error: "No profile data stored. Please fill in your info first." });
        return;
      }
      const result = fillPage(profile);
      sendResponse(result);
      startMutationRetry(profile);
    });
    return true; // keep message channel open for async sendResponse
  }

  if (message.type === "SCAN_NEW_ANSWERS") {
    chrome.storage.local.get("profile", ({ profile }) => {
      if (!profile) {
        sendResponse({ error: "No profile data stored." });
        return;
      }
      sendResponse({ candidates: scanForNewAnswers(profile) });
    });
    return true;
  }
});
