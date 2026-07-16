var SPREADSHEET_ID = '12msU0fCcR2hh-IGYHg0Sq0hpUhhAmLInXYCemurapr8';
var SHEET_NAME = 'Leads';
var MIN_SUBMIT_MS = 2500;
var MAX_SUBMIT_MS = 1000 * 60 * 60 * 3;
var ALLOWED_HOSTNAMES = [
  'emilieblanc.wine',
  'www.emilieblanc.wine',
  'provencewineclub.com.au',
  'www.provencewineclub.com.au'
];

function doGet() {
  return json_({ ok: true, service: 'Provence Wine Club leads' });
}

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

  var turnstileResult = verifyTurnstile_(p.turnstile_token);
  var verifiedHostname = normalizeHostname_(turnstileResult.hostname || '');
  validateHostname_(p.hostname, verifiedHostname);

  return verifiedHostname ? 'passed:' + verifiedHostname : 'passed';
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
  if (!result.success) {
    var codes = result['error-codes'] || [];
    if (codes.indexOf('timeout-or-duplicate') !== -1) {
      throw new Error('The anti-spam check expired. Please try again.');
    }
    throw new Error('Anti-spam check failed' + (codes.length ? ': ' + codes.join(', ') : '.'));
  }

  return result;
}

function validateHostname_(submittedHostname, verifiedHostname) {
  var submitted = normalizeHostname_(submittedHostname || '');
  var verified = normalizeHostname_(verifiedHostname || submitted);
  var hostname = verified || submitted;

  if (!hostname) return;
  if (ALLOWED_HOSTNAMES.indexOf(hostname) !== -1) return;

  throw new Error('Anti-spam check is not configured for this domain: ' + hostname);
}

function normalizeHostname_(hostname) {
  return String(hostname || '')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\.(?=www\.)/, '')
    .split('/')[0]
    .split(':')[0]
    .trim();
}

function appendLead_(p, spamStatus) {
  var sheet = getLeadsSheet_();
  sheet.appendRow([
    p.submitted_at || new Date().toISOString(),
    p.form_type || '',
    p.name || '',
    p.first_name || '',
    p.email || '',
    p.event_type || '',
    p.page || '',
    p.user_agent || '',
    p.hostname || '',
    spamStatus || ''
  ]);
}

function getLeadsSheet_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'submitted_at',
      'form_type',
      'name',
      'first_name',
      'email',
      'event_type',
      'page',
      'user_agent',
      'ip_hint',
      'spam_status'
    ]);
    sheet.setFrozenRows(1);
  }

  return sheet;
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
