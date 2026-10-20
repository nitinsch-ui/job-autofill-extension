# Job Application Autofill

A personal-use Chrome extension (Manifest V3, plain JavaScript, no build step) that stores your job-application details locally and fills matching fields on any job application page with one click.

## Setup

1. Open `chrome://extensions`.
2. Enable **Developer mode** (toggle, top right).
3. Click **Load unpacked** and select this folder (`job-autofill-extension/`).
4. The extension's options page opens automatically on first install — fill in your info there and click **Save All**.
5. On any job application page, click the extension's toolbar icon and press **Fill This Page**.

After editing any file, click the refresh icon on the extension's card in `chrome://extensions`, then reload any open tab you're testing against.

## Data storage

All data is stored in `chrome.storage.local` on this machine only — no sync, no account, no network calls. Clear it any time via the **Reset All Data** button on the options page, or by removing the extension.

## Known limitations

1. **File upload inputs can never be autofilled.** Browsers block programmatic assignment to `input[type=file].files` for security reasons. Always attach your resume manually. The options page lets you store a copy of your resume file locally and download it again as a convenience, but it is never used to fill a file input.
2. **Cross-origin iframes** (some ATS platforms embed the application form this way) are not reachable from the "Fill This Page" trigger on the main tab. Workaround: right-click the iframe and open it in a new tab, then run the extension there.
3. **Closed shadow DOM** (`attachShadow({mode: "closed"})`, used by some enterprise UIs) is fundamentally inaccessible to any extension — no workaround.
4. **Bot/CAPTCHA detection** may flag instant programmatic form fills on some sites. If an application gets blocked at a CAPTCHA step, fill that form manually.
5. **Multi-step forms** that reveal new fields after a "Continue" click need "Fill This Page" clicked again on each step.
6. Only the **first** work-history and education entry is auto-filled; additional entries must be filled in by hand.
7. Fuzzy field matching can occasionally fill the wrong field. **Always review every filled field before submitting.** The confidence threshold is tunable via `CONFIDENCE_THRESHOLD` in `content/field-matcher.js`.

## Improving field matching

If a field on some site isn't getting filled (or filled incorrectly), open DevTools console on that page before clicking "Fill This Page" — `content/content-script.js` and `content/field-matcher.js` can be extended with `console.log` calls to show the schema path and score each field matched against. Add missing phrases to the relevant entry's `aliases` array in `content/field-dictionary.js`, reload the extension, and retest.

## Testing

Open `test/sample-form.html` directly in Chrome (`file://` path). You'll need to toggle "Allow access to file URLs" for this extension in `chrome://extensions` → Details, since `file://` URLs are permissioned separately from the `<all_urls>` match pattern used for regular web pages. This fixture exercises every signal type the matcher supports (label-for, aria-label-only, placeholder-only, nearby-text-only, select dropdowns, radio groups, wrapping-label textarea, a file input that must be skipped, and a denylisted "I agree to Terms" checkbox that must never be touched).
