/* ==============================================
   UXBAN — Google Sheets helper
   Minimal wrapper around the Sheets REST API.
   Replaces the 36 MB googleapis package with
   google-auth-library (~800 KB) + fetch.
   ============================================== */

const { JWT } = require('google-auth-library');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Token + client cache — survives warm invocations
let _client = null;
let _token  = null;
let _expiry = 0;

async function getToken() {
  // Google access tokens last 1 hour. Refresh 5 min early.
  if (_token && Date.now() < _expiry - 5 * 60 * 1000) return _token;

  if (!_client) {
    _client = new JWT({
      email: process.env.GOOGLE_SERVICE_EMAIL,
      key:   process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: SCOPES,
    });
  }

  const { access_token, expiry_date } = await _client.authorize();
  _token  = access_token;
  _expiry = expiry_date || (Date.now() + 3600 * 1000);
  return _token;
}

async function request(method, url, body) {
  const token = await getToken();
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sheets ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

const base = (id) => `https://sheets.googleapis.com/v4/spreadsheets/${id}`;

async function get(spreadsheetId, range) {
  return request('GET', `${base(spreadsheetId)}/values/${range}`);
}

async function append(spreadsheetId, range, values) {
  return request('POST',
    `${base(spreadsheetId)}/values/${range}:append?valueInputOption=RAW`,
    { values });
}

async function update(spreadsheetId, range, values) {
  return request('PUT',
    `${base(spreadsheetId)}/values/${range}?valueInputOption=RAW`,
    { values });
}

async function clear(spreadsheetId, range) {
  return request('POST',
    `${base(spreadsheetId)}/values/${range}:clear`,
    {});
}

module.exports = { get, append, update, clear };