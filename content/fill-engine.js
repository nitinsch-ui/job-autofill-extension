// DOM value-setting: native-setter bypass for framework-controlled inputs,
// select/radio fuzzy option matching, and proper event dispatch.
// Depends on normalize/similarity/SELECT_SYNONYMS/getLabelForText/getWrappingLabelText from
// field-matcher.js and field-dictionary.js (loaded before this file).

function setNativeValue(el, value) {
  const proto =
    el.tagName === "TEXTAREA"
      ? window.HTMLTextAreaElement.prototype
      : el.tagName === "SELECT"
      ? window.HTMLSelectElement.prototype
      : window.HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
  if (descriptor && descriptor.set) {
    descriptor.set.call(el, value);
  } else {
    el.value = value;
  }
}

function selectBestOption(selectEl, targetValue) {
  const norm = normalize(String(targetValue));
  let bestIdx = -1;
  let bestScore = 0;

  Array.from(selectEl.options).forEach((opt, i) => {
    if (i === 0 && !opt.value) return; // skip placeholder "Select one..." option
    const optNorm = normalize(opt.textContent + " " + opt.value);
    let score = similarity(optNorm, norm);

    for (const synonymTable of [SELECT_SYNONYMS.country, SELECT_SYNONYMS.yesNo]) {
      for (const [canonical, synonyms] of Object.entries(synonymTable)) {
        const matchesTarget = canonical === norm || synonyms.includes(norm);
        const matchesOption = optNorm.includes(canonical) || synonyms.some((s) => optNorm.includes(s));
        if (matchesTarget && matchesOption) {
          score = Math.max(score, 0.85);
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  });

  if (bestIdx >= 0 && bestScore > 0.3) {
    selectEl.selectedIndex = bestIdx;
    return true;
  }
  return false;
}

function fillRadioGroup(groupEls, targetValue) {
  const norm = normalize(String(targetValue));
  let bestEl = null;
  let bestScore = 0;

  for (const radio of groupEls) {
    const radioLabel =
      getLabelForText(radio) ||
      getWrappingLabelText(radio) ||
      radio.getAttribute("aria-label") ||
      radio.value ||
      "";
    const radioNorm = normalize(radioLabel + " " + radio.value);
    let score = similarity(radioNorm, norm);

    for (const [canonical, synonyms] of Object.entries(SELECT_SYNONYMS.yesNo)) {
      const matchesTarget = canonical === norm || synonyms.includes(norm);
      const matchesOption = radioNorm.includes(canonical) || synonyms.some((s) => radioNorm.includes(s));
      if (matchesTarget && matchesOption) {
        score = Math.max(score, 0.8);
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestEl = radio;
    }
  }

  if (bestEl && bestScore > 0.3) {
    bestEl.checked = true;
    bestEl.dispatchEvent(new Event("change", { bubbles: true }));
    bestEl.dispatchEvent(new Event("click", { bubbles: true }));
    return true;
  }
  return false;
}

function applyValue(el, value) {
  try {
    el.focus();

    if (el.tagName === "SELECT") {
      const ok = selectBestOption(el, value);
      if (!ok) return false;
    } else if (el.type === "checkbox") {
      const shouldCheck = /^(yes|true|1)$/i.test(String(value));
      el.checked = shouldCheck;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.blur();
      return true;
    } else {
      setNativeValue(el, value);
    }

    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.blur();
    return true;
  } catch (e) {
    console.warn("[autofill] failed to set value on element:", el, e);
    return false;
  }
}
