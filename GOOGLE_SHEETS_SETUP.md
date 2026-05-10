# Google Sheets, Turnstile, and Telegram Setup

This site submits newsletter signups and event enquiries to a Google Apps Script web app. Apps Script verifies Cloudflare Turnstile, blocks basic spam, appends valid submissions to Google Sheets, and sends a Telegram message for event/contact enquiries.

## 1) Create the Google Sheet

- In Google Drive, create a new Google Sheet.
- Name the first tab `Leads`.
- Sheet URL for this site: `https://docs.google.com/spreadsheets/d/12msU0fCcR2hh-IGYHg0Sq0hpUhhAmLInXYCemurapr8/edit`
- Add these headers in row 1:
  - `submitted_at`
  - `form_type`
  - `first_name`
  - `name`
  - `email`
  - `event_type`
  - `page`
  - `user_agent`
  - `ip_hint`
  - `spam_status`

## 2) Create Cloudflare Turnstile Keys

- Go to Cloudflare Turnstile and create a widget for `emilieblanc.wine`.
- Copy the **site key**.
- The public Turnstile site key is already added to `index.html` and `emilie-blanc.html`.
- Copy the **secret key**. You will store it in Apps Script properties, not in this repo.

## 3) Create the Telegram Bot

- In Telegram, message `@BotFather`.
- Create a bot and copy its bot token.
- Send one message to your new bot from your Telegram account.
- In a browser, open:

```text
https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
```

- Find your numeric `chat.id`. That is your `TELEGRAM_CHAT_ID`.

## 4) Add Apps Script Properties

In the Google Sheet, open `Extensions` -> `Apps Script`, then open `Project Settings` -> `Script Properties`.

Add:

- `TURNSTILE_SECRET`: your Cloudflare Turnstile secret key
- `TELEGRAM_BOT_TOKEN`: your Telegram bot token
- `TELEGRAM_CHAT_ID`: your Telegram chat id

## 5) Add Apps Script Code

Replace the default Apps Script code with:

```javascript
var SHEET_NAME = 'Leads';
var MIN_SUBMIT_MS = 2500;
var MAX_SUBMIT_MS = 1000 * 60 * 60 * 3;

function doPost(e) {
  try {
    var p = e.parameter || {};
    var spamStatus = validateSubmission_(p);

    appendLead_(p, spamStatus);

    if (p.form_type === 'event_enquiry') {
      sendTelegram_(p);
    }

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: err.message || 'Submission rejected' });
  }
}

function validateSubmission_(p) {
  if (p.website) throw new Error('Spam rejected.');

  var renderedAt = Number(p.rendered_at || 0);
  var age = Date.now() - renderedAt;
  if (!renderedAt || age < MIN_SUBMIT_MS) throw new Error('Please wait a moment and try again.');
  if (age > MAX_SUBMIT_MS) throw new Error('This form expired. Please refresh and try again.');

  if (!isEmail_(p.email)) throw new Error('Please enter a valid email address.');

  if (p.form_type === 'event_enquiry') {
    if (!p.name || !p.event_type) throw new Error('Please complete the enquiry form.');
  } else if (p.form_type !== 'newsletter_signup') {
    throw new Error('Unknown form type.');
  }

  verifyTurnstile_(p.turnstile_token);
  return 'passed';
}

function verifyTurnstile_(token) {
  if (!token) throw new Error('Anti-spam check missing.');

  var secret = PropertiesService.getScriptProperties().getProperty('TURNSTILE_SECRET');
  if (!secret) throw new Error('Turnstile secret is not configured.');

  var response = UrlFetchApp.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'post',
    payload: {
      secret: secret,
      response: token
    },
    muteHttpExceptions: true
  });

  var result = JSON.parse(response.getContentText() || '{}');
  if (!result.success) throw new Error('Anti-spam check failed.');
}

function appendLead_(p, spamStatus) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_NAME);

  sheet.appendRow([
    p.submitted_at || new Date().toISOString(),
    p.form_type || '',
    p.first_name || '',
    p.name || '',
    p.email || '',
    p.event_type || '',
    p.page || '',
    p.user_agent || '',
    '',
    spamStatus || ''
  ]);
}

function sendTelegram_(p) {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('TELEGRAM_BOT_TOKEN');
  var chatId = props.getProperty('TELEGRAM_CHAT_ID');
  if (!token || !chatId) return;

  var message = [
    'New Provence Wine Club enquiry',
    '',
    'Name: ' + (p.name || '-'),
    'Email: ' + (p.email || '-'),
    'Type: ' + (p.event_type || '-'),
    'Page: ' + (p.page || '-'),
    'Submitted: ' + (p.submitted_at || new Date().toISOString())
  ].join('\n');

  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      chat_id: chatId,
      text: message,
      disable_web_page_preview: true
    }),
    muteHttpExceptions: true
  });
}

function isEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## 6) Deploy Apps Script as a Web App

- Click `Deploy` -> `New deployment`.
- Type: `Web app`.
- Execute as: `Me`.
- Who has access: `Anyone`.
- Click `Deploy`.
- Copy the **Web app URL**.

## 7) Connect the Website

- Open [script.js](/Users/emilieblanc/Emilie%20Wine%20Club/Website/script.js).
- Replace:
  - `PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE`
  - with your deployed Apps Script Web App URL.

## 8) Test

- Submit the newsletter form and confirm a row appears in `Leads`.
- Submit the event enquiry form and confirm:
  - a row appears in `Leads`
  - you receive a Telegram message
- Try submitting before completing Turnstile; it should be blocked.
- Try filling the hidden `website` honeypot field in dev tools; it should be rejected.
- Test on mobile Safari/Chrome after Vercel redeploy.

## Notes

- Do not commit Telegram tokens or Turnstile secrets to GitHub.
- Newsletter signups are saved to the sheet but do not trigger Telegram messages.
- Google Apps Script does not expose a reliable visitor IP address here, so `ip_hint` is intentionally blank.
