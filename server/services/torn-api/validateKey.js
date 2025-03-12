const fetch = require('node-fetch');

async function validateApiKey(apiKey) {
  const url = `https://api.torn.com/key/?key=${apiKey}&selections=info`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error validating API key: ${response.statusText}`);
  }
  const data = await response.json();
  // Only allow keys with access type 'Public Only'
  if (data.access_type !== 'Public Only') {
    throw new Error(`API key access type "${data.access_type}" is not allowed. Only Public Only keys are permitted.`);
  }
  return data;
}

module.exports = { validateApiKey }; 