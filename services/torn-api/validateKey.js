const TornApiClient = require('./client');

// One shared hardened client so key validation goes through _buildUrl's origin +
// per-segment encoding checks (the SSRF fix from #48/#51) instead of the old raw
// `https://api.torn.com/key/?key=${apiKey}` fetch that bypassed them (#56).
let sharedClient = null;
function client() {
  if (!sharedClient) {
    sharedClient = new TornApiClient();
  }
  return sharedClient;
}

async function validateApiKey(apiKey) {
  // section 'key' + 'info' selection, built and origin-checked by the client.
  const data = await client().request({ section: 'key', apiKey, selections: ['info'] });

  // Torn signals problems as a 200 with an { error } body (e.g. an invalid key).
  if (data && data.error) {
    throw new Error(`Error validating API key: ${data.error.error || 'unknown error'}`);
  }
  // Only allow keys with access type 'Public Only'.
  if (data.access_type !== 'Public Only') {
    throw new Error(`API key access type "${data.access_type}" is not allowed. Only Public Only keys are permitted.`);
  }
  return data;
}

module.exports = { validateApiKey };
