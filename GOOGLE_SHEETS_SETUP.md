# Google Sheets Email Capture Setup

## 1) Create your sheet
- In Google Drive, create a new Google Sheet.
- Name tab `Leads`.
- In row 1, add headers:
  - `submitted_at`
  - `form_type`
  - `first_name`
  - `name`
  - `email`
  - `event_type`
  - `page`

## 2) Add Apps Script
- In the Google Sheet: `Extensions` -> `Apps Script`.
- Replace the default code with:

```javascript
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Leads');
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Leads');
  }

  var p = e.parameter || {};
  sheet.appendRow([
    p.submitted_at || new Date().toISOString(),
    p.form_type || '',
    p.first_name || '',
    p.name || '',
    p.email || '',
    p.event_type || '',
    p.page || ''
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## 3) Deploy as Web App
- Click `Deploy` -> `New deployment`.
- Type: `Web app`.
- Execute as: `Me`.
- Who has access: `Anyone`.
- Click `Deploy`.
- Copy the **Web app URL**.

## 4) Paste URL into your site
- Open [script.js](/Users/emilieblanc/Emilie%20Wine%20Club/Website/script.js).
- Replace:
  - `PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE`
  - with your real deployed URL.

## 5) Test
- Open your website.
- Submit:
  - newsletter form (`Join the List`)
  - event enquiry form
- Confirm rows appear in your `Leads` tab.

## Notes
- If you redeploy a new version, keep using the latest Web app URL.
- For production, add a privacy policy and consent wording near the form.
