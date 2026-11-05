const test = require('node:test');
const assert = require('node:assert');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

const API_URL = 'http://localhost:5000/api';

test('GeoCommerce AI Copilot - Dataset Isolation & Grounded Analytics Test', async (t) => {
  let sellerToken;
  let sellerId;
  let uploadedDatasetId;
  const testEmail = `copilot_audit_${Date.now()}@ecomtest.in`;

  const authHeader = () => ({
    headers: { Authorization: `Bearer ${sellerToken}` }
  });

  // Step 1: Register fresh seller
  await t.test('1. Register fresh isolated seller', async () => {
    const regRes = await axios.post(`${API_URL}/auth/register`, {
      name: 'Rohan Verma',
      email: testEmail,
      password: 'SecurePassword2026!',
      storeName: 'Verma Smart Retail'
    });
    assert.strictEqual(regRes.status, 201);
    sellerToken = regRes.data.token;
    sellerId = regRes.data.user.id;
    assert.ok(sellerToken, 'Must receive JWT token');
  });

  // Step 2: Upload 1200-order alternate dataset (15 products, 18 cities, NO Kolkata)
  await t.test('2. Upload 1,200-order alternate sales dataset', async () => {
    const csvPath = path.resolve(__dirname, '../data/sample_sales_data_1200_alternate.csv');
    assert.ok(fs.existsSync(csvPath), 'Alternate 1200 dataset CSV must exist');

    const form = new FormData();
    form.append('file', fs.createReadStream(csvPath));

    const upRes = await axios.post(`${API_URL}/sales/upload`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${sellerToken}`
      }
    });

    assert.strictEqual(upRes.status, 200);
    assert.strictEqual(upRes.data.summary.validImported, 1200, 'Must import all 1200 records');
    assert.ok(upRes.data.datasetId, 'Upload must yield unique datasetId');
    uploadedDatasetId = upRes.data.datasetId;
  });

  // Step 3: Verify datasets endpoint reports this dataset as active
  await t.test('3. Verify active dataset tracking', async () => {
    const dsRes = await axios.get(`${API_URL}/sales/datasets`, authHeader());
    assert.strictEqual(dsRes.status, 200);
    assert.ok(Array.isArray(dsRes.data.datasets));
    assert.strictEqual(dsRes.data.datasets.length, 1);
    const activeDs = dsRes.data.datasets[0];
    assert.strictEqual(activeDs.datasetId, uploadedDatasetId);
    assert.strictEqual(activeDs.isActive, true);
    assert.strictEqual(activeDs.recordCount, 1200);
    assert.strictEqual(activeDs.productCount, 15, 'Must report exactly 15 products');
    assert.strictEqual(activeDs.cityCount, 18, 'Must report exactly 18 cities');
  });

  // Step 4: Ask Copilot: "Which product sells the most in Kolkata?"
  // Kolkata is NOT in this dataset -> Must explicitly say no data available for Kolkata!
  await t.test('4. Copilot handles missing location (Kolkata)', async () => {
    const chatRes = await axios.post(`${API_URL}/ai/chat`, {
      message: 'Which product sells the most in Kolkata?'
    }, authHeader());

    assert.strictEqual(chatRes.status, 200);
    const reply = (chatRes.data.reply || chatRes.data.message || '').toLowerCase();
    console.log('\n[Kolkata Query AI Response]:\n', chatRes.data.reply);

    // Verify it NEVER returns AeroStride Running Shoes
    assert.ok(!reply.includes('aerostride'), 'Must NOT return AeroStride running shoes');
    assert.ok(!reply.includes('artisanroast'), 'Must NOT return ArtisanRoast');
    assert.ok(!reply.includes('urbancraft'), 'Must NOT return UrbanCraft');

    // Verify it explicitly states no sales data for Kolkata
    assert.ok(
      reply.includes('no sales data is available for kolkata') ||
      reply.includes('no sales data is available for **kolkata') ||
      reply.includes('no data is available for kolkata'),
      'Must state no sales data is available for Kolkata'
    );
  });

  // Step 5: Ask Copilot: "which products is more famous of pricing more than 1400"
  // Must return products priced > 1400 (SmartPulse, ZenSound, etc.), NOT general revenue ₹46,31,793
  await t.test('5. Copilot filters products by price (> 1400)', async () => {
    const chatRes = await axios.post(`${API_URL}/ai/chat`, {
      message: 'which products is more famous of pricing more than 1400'
    }, authHeader());

    assert.strictEqual(chatRes.status, 200);
    const reply = (chatRes.data.reply || chatRes.data.message || '');
    console.log('\n[Price > 1400 Query AI Response]:\n', reply);

    // Verify it NEVER quotes ₹46,31,793 from old demo data
    assert.ok(!reply.includes('46,31,793'), 'Must NOT return old demo revenue ₹46,31,793');

    // Verify it returns actual products priced > 1400
    const lower = reply.toLowerCase();
    const hasPricedOver1400Product =
      lower.includes('smartpulse') ||
      lower.includes('zensound') ||
      lower.includes('auraglow') ||
      lower.includes('urbandenim') ||
      lower.includes('airbreeze');

    assert.ok(hasPricedOver1400Product, 'Must identify products priced > 1400 from active dataset');
  });

  // Step 6: Ask Copilot about a location that DOES exist (e.g. Siliguri)
  await t.test('6. Copilot provides verified data for existing location (Siliguri)', async () => {
    const chatRes = await axios.post(`${API_URL}/ai/chat`, {
      message: 'Which product is most popular in Siliguri?'
    }, authHeader());

    assert.strictEqual(chatRes.status, 200);
    const reply = (chatRes.data.reply || chatRes.data.message || '');
    console.log('\n[Siliguri Query AI Response]:\n', reply);

    // Verify it answers with products from the active dataset
    assert.ok(!reply.toLowerCase().includes('aerostride'), 'Must NOT return AeroStride');
    assert.ok(
      reply.toLowerCase().includes('siliguri') && (reply.includes('units') || reply.includes('Units')),
      'Must return verified sales units for Siliguri'
    );
  });
});

