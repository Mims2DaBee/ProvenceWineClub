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

- Go to Cloudflare Turnstile and create a widget for the live domains.
- Include every hostname the forms may load from:
  - `emilieblanc.wine`
  - `www.emilieblanc.wine`
  - `provencewineclub.com.au`
  - `www.provencewineclub.com.au`
- Copy the **site key**.
- The public Turnstile site key is already added to [script.js](/Users/emilieblanc/Emilie%20Wine%20Club/Website/script.js).
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

Replace the default Apps Script code with [apps-script/Code.gs](/Users/emilieblanc/Emilie%20Wine%20Club/Website/apps-script/Code.gs).

The script currently allows these hostnames after Turnstile verifies the token:

- `emilieblanc.wine`
- `www.emilieblanc.wine`
- `provencewineclub.com.au`
- `www.provencewineclub.com.au`

If another production domain is added later, add it to `ALLOWED_HOSTNAMES` in `Code.gs` and redeploy the Apps Script web app.

```javascript
// Short excerpt only. Use apps-script/Code.gs as the source of truth.
var ALLOWED_HOSTNAMES = [
  'emilieblanc.wine',
  'www.emilieblanc.wine',
  'provencewineclub.com.au',
  'www.provencewineclub.com.au'
];

// The full script validates Turnstile, checks the verified hostname,
// writes hostname into the ip_hint column, appends to Leads, and sends Telegram.
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
- If you see `Anti-spam check is not configured for this domain`, add that hostname to both Cloudflare Turnstile and `ALLOWED_HOSTNAMES`, then redeploy Apps Script.
- Test on mobile Safari/Chrome after Vercel redeploy.

## Notes

- Do not commit Telegram tokens or Turnstile secrets to GitHub.
- Newsletter signups are saved to the sheet but do not trigger Telegram messages.
- Google Apps Script does not expose a reliable visitor IP address here, so `ip_hint` stores the submitted hostname for domain debugging.
