// Field enumeration, label/signal extraction, normalization, and scoring.
// Depends on FIELD_DICTIONARY / DENYLIST_TERMS from field-dictionary.js (loaded before this file).

const FILLABLE_SELECTOR =
  "input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]):not([type=image]), textarea, select";

function isVisible(el) {
  if (!el.isConnected) return false;
  const style = getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  return !!(el.offsetParent !== null || el.offsetWidth || el.offsetHeight);
}

function enumerateFillableFields(root) {
  root = root || document;
  let nodes = Array.from(root.querySelectorAll(FILLABLE_SELECTOR));

  // Descend into open shadow roots.
  root.querySelectorAll("*").forEach((el) => {
    if (el.shadowRoot) {
      nodes = nodes.concat(enumerateFillableFields(el.shadowRoot));
    }
  });

  // Descend into same-origin iframes; cross-origin ones throw and are skipped.
  root.querySelectorAll("iframe").forEach((frame) => {
    try {
      if (frame.contentDocument) {
        nodes = nodes.concat(enumerateFillableFields(frame.contentDocument));
      }
    } catch (e) {
      // cross-origin iframe — inaccessible, skip
    }
  });

  return root === document ? nodes.filter(isVisible) : nodes;
}

function getLabelForText(el) {
  if (!el.id) return "";
  const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
  return label ? label.textContent.trim() : "";
}

function getWrappingLabelText(el) {
  const label = el.closest("label");
  if (!label) return "";
  return label.textContent.replace(el.value || "", "").trim();
}

function getAriaLabelledByText(el) {
  const ids = (el.getAttribute("aria-labelledby") || "").split(/\s+/).filter(Boolean);
  return ids
    .map((id) => {
      const ref = document.getElementById(id);
      return ref ? ref.textContent.trim() : "";
    })
    .join(" ");
}

function getFieldsetLegendText(el) {
  const fieldset = el.closest("fieldset");
  if (!fieldset) return "";
  const legend = fieldset.querySelector("legend");
  return legend ? legend.textContent.trim() : "";
}

function getNearbyText(el) {
  let node = el;
  for (let depth = 0; depth < 3; depth++) {
    const parent = node.parentElement;
    if (!parent) break;
    const sib = node.previousElementSibling;
    if (sib) {
      const text = sib.textContent.trim();
      if (text && text.length < 100) return text;
    }
    const directText = Array.from(parent.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent.trim())
      .filter(Boolean)
      .join(" ");
    if (directText && directText.length < 100) return directText;
    node = parent;
  }
  return "";
}

function extractSignals(el) {
  return {
    labelFor: getLabelForText(el),
    labelWrapping: getWrappingLabelText(el),
    ariaLabel: el.getAttribute("aria-label") || "",
    ariaLabelledBy: getAriaLabelledByText(el),
    legendText: getFieldsetLegendText(el),
    placeholder: el.getAttribute("placeholder") || "",
    nearbyText: getNearbyText(el),
    name: el.getAttribute("name") || "",
    id: el.getAttribute("id") || ""
  };
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_\-.]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1.0;
  if (a.includes(b) || b.includes(a)) return 0.9;
  const ta = new Set(a.split(" ").filter(Boolean));
  const tb = new Set(b.split(" ").filter(Boolean));
  const intersection = [...ta].filter((t) => tb.has(t)).length;
  const union = new Set([...ta, ...tb]).size;
  return union > 0 ? intersection / union : 0;
}

const SOURCE_WEIGHTS = {
  labelFor: 1.0,
  labelWrapping: 1.0,
  ariaLabel: 0.95,
  ariaLabelledBy: 0.95,
  legendText: 0.85,
  placeholder: 0.6,
  nearbyText: 0.5,
  name: 0.4,
  id: 0.3
};

const CONFIDENCE_THRESHOLD = 0.45;
const LEARNED_CONFIDENCE_THRESHOLD = 0.6;

function scoreFieldAgainstEntry(signals, dictEntry) {
  let best = 0;
  for (const [source, rawText] of Object.entries(signals)) {
    if (!rawText) continue;
    const norm = normalize(rawText);
    const srcWeight = SOURCE_WEIGHTS[source] || 0.3;
    for (const alias of dictEntry.aliases) {
      const sim = similarity(norm, alias);
      const score = sim * srcWeight * dictEntry.weight;
      if (score > best) best = score;
    }
  }
  return best;
}

// Learned answers are a single remembered question phrase rather than a curated
// alias list, so they get no dictionary-weight boost — just source-weighted similarity.
function scoreFieldAgainstLearned(signals, learnedEntry) {
  const aliasNorm = normalize(learnedEntry.questionText);
  if (!aliasNorm) return 0;
  let best = 0;
  for (const [source, rawText] of Object.entries(signals)) {
    if (!rawText) continue;
    const norm = normalize(rawText);
    const srcWeight = SOURCE_WEIGHTS[source] || 0.3;
    const score = similarity(norm, aliasNorm) * srcWeight;
    if (score > best) best = score;
  }
  return best;
}

function isDenylisted(signals) {
  const allText = Object.values(signals).join(" ").toLowerCase();
  return DENYLIST_TERMS.some((term) => allText.includes(term));
}

// Returns { kind: 'schema', schemaPath, score } or { kind: 'learned', learnedId, score },
// or null if nothing clears its confidence threshold. `learnedAnswers` is optional —
// pass profile.learnedAnswers to also consider previously-recorded free-text answers.
function matchField(el, learnedAnswers) {
  learnedAnswers = learnedAnswers || [];
  const signals = extractSignals(el);
  if (isDenylisted(signals)) return null;

  let best = null;

  for (const [schemaPath, dictEntry] of Object.entries(FIELD_DICTIONARY)) {
    let score = scoreFieldAgainstEntry(signals, dictEntry);
    if (dictEntry.inputTypeHints && dictEntry.inputTypeHints.includes(el.type)) {
      score = Math.max(score, 0.75);
    }
    if (!best || score > best.score) {
      best = { kind: "schema", schemaPath, score };
    }
  }

  for (const entry of learnedAnswers) {
    const score = scoreFieldAgainstLearned(signals, entry);
    if (!best || score > best.score) {
      best = { kind: "learned", learnedId: entry.id, score };
    }
  }

  if (!best) return null;
  const threshold = best.kind === "learned" ? LEARNED_CONFIDENCE_THRESHOLD : CONFIDENCE_THRESHOLD;
  return best.score >= threshold ? best : null;
}
