const fs = require('fs');
const path = require('path');

let geoDirectory = { pincodes: {}, state_centroids: {} };

try {
  const geoPath = path.resolve(__dirname, '../../data/pincode_india_directory.json');
  if (fs.existsSync(geoPath)) {
    geoDirectory = JSON.parse(fs.readFileSync(geoPath, 'utf8'));
    console.log(`Loaded ${Object.keys(geoDirectory.pincodes).length} verified India PIN codes into backend cache.`);
  }
} catch (err) {
  console.warn('Failed to load pincode_india_directory.json:', err.message);
}

function lookupPincode(pincode) {
  if (!pincode) return null;
  const clean = String(pincode).trim().split('.')[0].padStart(6, '0');
  if (geoDirectory.pincodes && geoDirectory.pincodes[clean]) {
    return { ...geoDirectory.pincodes[clean], pincode: clean };
  }
  return null;
}

function getStateCentroid(state) {
  if (!state || !geoDirectory.state_centroids) return null;
  return geoDirectory.state_centroids[state] || null;
}

module.exports = { lookupPincode, getStateCentroid, geoDirectory };

