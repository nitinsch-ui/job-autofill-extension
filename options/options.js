// Options page logic: load profile into form, render repeatable cards,
// serialize form back to the schema shape, save, reset, and resume file handling.

let currentProfile = null;

const SIMPLE_FIELD_IDS = [
  "personal.firstName", "personal.middleName", "personal.lastName",
  "personal.preferredName", "personal.pronouns", "personal.dateOfBirth",
  "contact.email", "contact.phone", "contact.phoneCountryCode",
  "address.street1", "address.street2", "address.city", "address.state",
  "address.zip", "address.country",
  "workAuthorization.authorizedToWorkInCountry", "workAuthorization.requiresSponsorship",
  "workAuthorization.visaStatus",
  "experience.totalYearsExperience", "experience.currentTitle", "experience.currentEmployer",
  "experience.desiredSalary", "experience.desiredSalaryPeriod", "experience.noticePeriod",
  "experience.willingToRelocate", "experience.willingToTravel",
  "links.linkedin", "links.github", "links.portfolio", "links.website",
  "demographics.gender", "demographics.race", "demographics.veteranStatus",
  "demographics.disabilityStatus", "demographics.hispanicOrLatino",
  "documents.resumeText", "documents.coverLetterTemplate",
  "freeTextAnswers.whyThisCompany", "freeTextAnswers.whyThisRole",
  "freeTextAnswers.greatestStrength", "freeTextAnswers.additionalInfo"
];

function getByPath(obj, path) {
  return path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
}

function setByPath(obj, path, value) {
  const keys = path.split(".");
  let node = obj;
  for (let i = 0; i < keys.length - 1; i++) node = node[keys[i]];
  node[keys[keys.length - 1]] = value;
}

function populateSimpleFields(profile) {
  for (const path of SIMPLE_FIELD_IDS) {
    const el = document.getElementById(path);
    if (!el) continue;
    const value = getByPath(profile, path);
    el.value = value === undefined || value === null ? "" : value;
  }
  document.getElementById("demographics.optOut").checked = !!profile.demographics.optOut;
  updateDemographicsVisibility();
}

function readSimpleFields(profile) {
  for (const path of SIMPLE_FIELD_IDS) {
    const el = document.getElementById(path);
    if (!el) continue;
    setByPath(profile, path, el.value);
  }
  profile.demographics.optOut = document.getElementById("demographics.optOut").checked;
}

function updateDemographicsVisibility() {
  const optOut = document.getElementById("demographics.optOut").checked;
  document.getElementById("demographicsFields").style.opacity = optOut ? "0.5" : "1";
}

// --- Work History repeatable cards ---

function renderWorkHistory(entries) {
  const container = document.getElementById("workHistoryList");
  container.innerHTML = "";
  entries.forEach((entry) => container.appendChild(buildWorkHistoryCard(entry)));
}

function buildWorkHistoryCard(entry) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.id = entry.id;
  card.innerHTML = `
    <div class="card-header"><button type="button" class="remove-btn">Remove</button></div>
    <div class="field-grid">
      <label>Employer <input type="text" data-field="employer" value="${escapeAttr(entry.employer)}" /></label>
      <label>Title <input type="text" data-field="title" value="${escapeAttr(entry.title)}" /></label>
      <label>Location <input type="text" data-field="location" value="${escapeAttr(entry.location)}" /></label>
      <label>Start Date <input type="month" data-field="startDate" value="${escapeAttr(entry.startDate)}" /></label>
      <label>End Date <input type="month" data-field="endDate" value="${escapeAttr(entry.endDate)}" ${entry.current ? "disabled" : ""} /></label>
      <label class="checkbox-row"><input type="checkbox" data-field="current" ${entry.current ? "checked" : ""} /> I currently work here</label>
    </div>
    <label class="block-label">Description <textarea data-field="description" rows="3">${escapeHtml(entry.description)}</textarea></label>
  `;
  card.querySelector(".remove-btn").addEventListener("click", () => card.remove());
  const currentCheckbox = card.querySelector('[data-field="current"]');
  const endDateInput = card.querySelector('[data-field="endDate"]');
  currentCheckbox.addEventListener("change", () => {
    endDateInput.disabled = currentCheckbox.checked;
    if (currentCheckbox.checked) endDateInput.value = "";
  });
  return card;
}

function readWorkHistory() {
  return Array.from(document.querySelectorAll("#workHistoryList .card")).map((card) => ({
    id: card.dataset.id,
    employer: card.querySelector('[data-field="employer"]').value,
    title: card.querySelector('[data-field="title"]').value,
    location: card.querySelector('[data-field="location"]').value,
    startDate: card.querySelector('[data-field="startDate"]').value,
    endDate: card.querySelector('[data-field="endDate"]').value,
    current: card.querySelector('[data-field="current"]').checked,
    description: card.querySelector('[data-field="description"]').value
  }));
}

// --- Education repeatable cards ---

const DEGREE_OPTIONS = [
  "High School Diploma", "Associate's", "Bachelor's", "Master's", "Doctorate", "Certificate", "Other"
];

function renderEducation(entries) {
  const container = document.getElementById("educationList");
  container.innerHTML = "";
  entries.forEach((entry) => container.appendChild(buildEducationCard(entry)));
}

function buildEducationCard(entry) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.id = entry.id;
  const degreeOptionsHtml = DEGREE_OPTIONS.map(
    (d) => `<option value="${escapeAttr(d)}" ${entry.degree === d ? "selected" : ""}>${d}</option>`
  ).join("");
  card.innerHTML = `
    <div class="card-header"><button type="button" class="remove-btn">Remove</button></div>
    <div class="field-grid">
      <label>School <input type="text" data-field="school" value="${escapeAttr(entry.school)}" /></label>
      <label>Degree
        <select data-field="degree">
          <option value="">Select…</option>
          ${degreeOptionsHtml}
        </select>
      </label>
      <label>Field of Study <input type="text" data-field="fieldOfStudy" value="${escapeAttr(entry.fieldOfStudy)}" /></label>
      <label>GPA <input type="text" data-field="gpa" value="${escapeAttr(entry.gpa)}" /></label>
      <label>Start Date <input type="month" data-field="startDate" value="${escapeAttr(entry.startDate)}" /></label>
      <label>End Date <input type="month" data-field="endDate" value="${escapeAttr(entry.endDate)}" ${entry.current ? "disabled" : ""} /></label>
      <label class="checkbox-row"><input type="checkbox" data-field="current" ${entry.current ? "checked" : ""} /> Currently enrolled</label>
    </div>
  `;
  card.querySelector(".remove-btn").addEventListener("click", () => card.remove());
  const currentCheckbox = card.querySelector('[data-field="current"]');
  const endDateInput = card.querySelector('[data-field="endDate"]');
  currentCheckbox.addEventListener("change", () => {
    endDateInput.disabled = currentCheckbox.checked;
    if (currentCheckbox.checked) endDateInput.value = "";
  });
  return card;
}

function readEducation() {
  return Array.from(document.querySelectorAll("#educationList .card")).map((card) => ({
    id: card.dataset.id,
    school: card.querySelector('[data-field="school"]').value,
    degree: card.querySelector('[data-field="degree"]').value,
    fieldOfStudy: card.querySelector('[data-field="fieldOfStudy"]').value,
    gpa: card.querySelector('[data-field="gpa"]').value,
    startDate: card.querySelector('[data-field="startDate"]').value,
    endDate: card.querySelector('[data-field="endDate"]').value,
    current: card.querySelector('[data-field="current"]').checked
  }));
}

// --- Resume file handling ---

function updateResumeFileUi(profile) {
  const statusEl = document.getElementById("resumeFileStatus");
  const downloadLink = document.getElementById("resumeDownloadLink");
  const clearBtn = document.getElementById("clearResumeBtn");
  if (profile.documents.resumeFileName) {
    statusEl.textContent = `Stored: ${profile.documents.resumeFileName}`;
    downloadLink.href = profile.documents.resumeFileDataUrl;
    downloadLink.download = profile.documents.resumeFileName;
    downloadLink.style.display = "inline-block";
    clearBtn.style.display = "inline-block";
  } else {
    statusEl.textContent = "No resume file stored.";
    downloadLink.style.display = "none";
    clearBtn.style.display = "none";
  }
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function escapeAttr(str) {
  return escapeHtml(str);
}

function showSaveStatus(text) {
  const el = document.getElementById("saveStatus");
  el.textContent = text;
  if (text) setTimeout(() => { el.textContent = ""; }, 2000);
}

// --- JSON Import / Export ---
// Lets you paste one JSON blob (any subset of the schema) instead of typing
// into every field. Deep-merges onto the current profile so partial input is fine.

function isPlainObject(val) {
  return val !== null && typeof val === "object" && !Array.isArray(val);
}

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (isPlainObject(source[key]) && isPlainObject(target[key])) {
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

function handleExportJson() {
  const profile = currentProfile || getDefaultProfile();
  document.getElementById("importExportJson").value = JSON.stringify(profile, null, 2);
  showImportStatus("Exported");
}

async function handleImportJson() {
  const raw = document.getElementById("importExportJson").value.trim();
  if (!raw) {
    showImportStatus("Paste some JSON first");
    return;
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    showImportStatus("Invalid JSON: " + e.message);
    return;
  }
  if (!isPlainObject(parsed)) {
    showImportStatus("JSON must be an object");
    return;
  }

  const profile = currentProfile || getDefaultProfile();
  deepMerge(profile, parsed);
  if (Array.isArray(parsed.workHistory)) {
    profile.workHistory = parsed.workHistory.map((entry) =>
      deepMerge(makeEmptyWorkHistoryEntry(), entry)
    );
  }
  if (Array.isArray(parsed.education)) {
    profile.education = parsed.education.map((entry) =>
      deepMerge(makeEmptyEducationEntry(), entry)
    );
  }
  profile.schemaVersion = SCHEMA_VERSION;

  await saveProfile(profile);
  currentProfile = profile;
  populateSimpleFields(profile);
  renderWorkHistory(profile.workHistory);
  renderEducation(profile.education);
  updateResumeFileUi(profile);
  showImportStatus("Imported and saved");
}

function showImportStatus(text) {
  const el = document.getElementById("importStatus");
  el.textContent = text;
  if (text) setTimeout(() => { el.textContent = ""; }, 3000);
}

async function loadAndRender() {
  currentProfile = await getProfile();
  populateSimpleFields(currentProfile);
  renderWorkHistory(currentProfile.workHistory);
  renderEducation(currentProfile.education);
  updateResumeFileUi(currentProfile);
}

async function handleSave() {
  const profile = currentProfile || getDefaultProfile();
  readSimpleFields(profile);
  profile.workHistory = readWorkHistory();
  profile.education = readEducation();
  await saveProfile(profile);
  currentProfile = profile;
  showSaveStatus("Saved");
}

function handleResumeFileChange(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    currentProfile.documents.resumeFileDataUrl = reader.result;
    currentProfile.documents.resumeFileName = file.name;
    updateResumeFileUi(currentProfile);
  };
  reader.readAsDataURL(file);
}

function handleClearResume() {
  currentProfile.documents.resumeFileDataUrl = "";
  currentProfile.documents.resumeFileName = "";
  document.getElementById("resumeFileInput").value = "";
  updateResumeFileUi(currentProfile);
}

async function handleReset() {
  const confirmed = confirm("This will permanently delete all stored profile data. Are you sure?");
  if (!confirmed) return;
  await chrome.storage.local.clear();
  const fresh = getDefaultProfile();
  await saveProfile(fresh);
  location.reload();
}

document.addEventListener("DOMContentLoaded", () => {
  loadAndRender();

  document.getElementById("saveBtn").addEventListener("click", (e) => {
    e.preventDefault();
    handleSave();
  });

  document.getElementById("addWorkHistoryBtn").addEventListener("click", () => {
    document.getElementById("workHistoryList").appendChild(buildWorkHistoryCard(makeEmptyWorkHistoryEntry()));
  });

  document.getElementById("addEducationBtn").addEventListener("click", () => {
    document.getElementById("educationList").appendChild(buildEducationCard(makeEmptyEducationEntry()));
  });

  document.getElementById("demographics.optOut").addEventListener("change", updateDemographicsVisibility);

  document.getElementById("resumeFileInput").addEventListener("change", handleResumeFileChange);
  document.getElementById("clearResumeBtn").addEventListener("click", handleClearResume);

  document.getElementById("resetBtn").addEventListener("click", handleReset);

  document.getElementById("exportJsonBtn").addEventListener("click", handleExportJson);
  document.getElementById("importJsonBtn").addEventListener("click", handleImportJson);
});
