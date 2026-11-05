const test = require('node:test');
const assert = require('node:assert');
const axios = require('../backend/node_modules/axios');
const path = require('path');

// We will test against the running backend server on port 5000 and ML service on port 8000
const API_URL = 'http://127.0.0.1:5000/api';

test('Full End-to-End Workflow Integration Test', async (t) => {
  let token = '';
  let sellerId = '';

  await t.test('Step 0: Health and Database Status Endpoints', async () => {
    // Health Check
    const healthRes = await axios.get(`${API_URL}/health`);
    assert.strictEqual(healthRes.status, 200);
    assert.strictEqual(healthRes.data.status, 'healthy');
    assert.ok(healthRes.data.database, 'Database health section must be present');
    assert.ok(healthRes.data.gemini, 'Gemini status section must be present');

    // DB Status Check (No credentials leaked)
    const dbRes = await axios.get(`${API_URL}/db-status`);
    assert.strictEqual(dbRes.status, 200);
    assert.strictEqual(typeof dbRes.data.connected, 'boolean');
    assert.ok(dbRes.data.status, 'Status field must be present');
    assert.ok(!JSON.stringify(dbRes.data).includes('@'), 'Must not leak credentials');
  });

  await t.test('Step 1: Seller Registration & JWT Authentication', async () => {
    const res = await axios.post(`${API_URL}/auth/register`, {
      name: 'Priya E-Commerce Test',
      email: `priya_${Date.now()}@ecomtest.in`,
      password: 'StrongPassword2026!',
      storeName: 'Priya Tech & Lifestyle India'
    });

    assert.strictEqual(res.status, 201);
    assert.ok(res.data.token, 'Token should be returned');
    assert.ok(res.data.user.id, 'User ID should be returned');
    token = res.data.token;
    sellerId = res.data.user.id;
  });

  const authHeader = () => ({ headers: { Authorization: `Bearer ${token}` } });

  await t.test('Step 2: Sales Data Ingestion (One-Click Sample Seeding)', async () => {
    const res = await axios.post(`${API_URL}/sales/load-sample`, {}, authHeader());
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.count >= 1000, 'Should load over 1000 authentic sales records');
  });

  await t.test('Step 3: Analytics Generation (Overview & Regional Aggregations)', async () => {
    const res = await axios.get(`${API_URL}/analytics/overview`, authHeader());
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.totalRevenue > 100000, 'Total revenue should be computed');
    assert.ok(res.data.distinctStatesCount > 10, 'Should cover multiple Indian states');
    assert.ok(res.data.monthlyTrend.length > 0, 'Monthly trend should be populated');

    const regRes = await axios.get(`${API_URL}/analytics/regional-demand?level=state`, authHeader());
    assert.strictEqual(regRes.status, 200);
    assert.ok(regRes.data.regions.length > 5, 'Should return multiple regional groupings');
    assert.ok(regRes.data.regions[0].topProduct, 'Each region should identify top product');

    const mapRes = await axios.get(`${API_URL}/analytics/map-data`, authHeader());
    assert.strictEqual(mapRes.status, 200);
    assert.ok(mapRes.data.points.length > 20, 'Should return 20+ Leaflet map pinpoint coordinates');
    assert.ok(mapRes.data.points[0].lat && mapRes.data.points[0].lng, 'Coordinates must be valid lat/lng');
  });

  await t.test('Step 4: ML Prediction Endpoints (Forecasting, Opportunity, Inventory, Apriori)', async () => {
    try {
      // 1. Demand Forecast
      const fcRes = await axios.post(`${API_URL}/ml/forecast`, { horizonDays: 30 }, authHeader());
      assert.strictEqual(fcRes.status, 200);
      assert.ok(fcRes.data.aggregates, 'Forecast aggregates must exist');
      assert.ok(fcRes.data.metrics.model_rmse !== undefined, 'Model RMSE must be evaluated');

      // 2. Opportunity Scoring
      const oppRes = await axios.post(`${API_URL}/ml/opportunity-score`, { groupBy: 'state' }, authHeader());
      assert.strictEqual(oppRes.status, 200);
      assert.ok(oppRes.data.results.length > 0, 'Opportunity results must be returned');

      // 3. Inventory Optimization
      const invRes = await axios.post(`${API_URL}/ml/inventory-optimizer`, { leadTimeDays: 7 }, authHeader());
      assert.strictEqual(invRes.status, 200);
      assert.ok(invRes.data.inventory_items.length > 0, 'Inventory items must be returned');

      // 4. Bundles (Apriori)
      const bundleRes = await axios.post(`${API_URL}/ml/bundles`, {}, authHeader());
      assert.strictEqual(bundleRes.status, 200);

      // 5. Warehouse Optimization
      const whRes = await axios.post(`${API_URL}/ml/warehouse-optimizer`, { numRecommended: 2 }, authHeader());
      assert.strictEqual(whRes.status, 200);
    } catch (err) {
      console.error('STEP 4 ERROR DETAIL:', err.response?.data || err.message);
      throw err;
    }
  });

  await t.test('Step 5: AI Copilot Grounded Tool-Calling Response (/api/copilot/ask and /api/ai/chat)', async () => {
    // 1. Existing frontend endpoint /api/copilot/ask
    const res = await axios.post(
      `${API_URL}/copilot/ask`,
      { message: 'Which product sells the most in Kolkata?' },
      authHeader()
    );
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.reply.length > 20, 'Copilot must provide an executive reply');
    assert.ok(res.data.groundedData, 'Grounded analytics must be attached');
    assert.strictEqual(res.data.groundedData.location, 'KOLKATA');

    // 2. Official /api/ai/chat endpoint
    const aiChatRes = await axios.post(
      `${API_URL}/ai/chat`,
      { prompt: 'What are the urgent inventory restock recommendations?' },
      authHeader()
    );
    assert.strictEqual(aiChatRes.status, 200);
    assert.ok(aiChatRes.data.reply, 'AI reply must exist');
    assert.strictEqual(aiChatRes.data.hasData, true);
    assert.strictEqual(aiChatRes.data.contextType, 'inventory_restock');
  });

  await t.test('Step 6: Reports Export (CSV & PDF Generation)', async () => {
    try {
      const csvRes = await axios.get(`${API_URL}/reports/export-csv`, {
        ...authHeader(),
        responseType: 'text'
      });
      assert.strictEqual(csvRes.status, 200);
      assert.ok(csvRes.data.includes('Order ID,Product ID,Product Name'), 'CSV header must be present');

      const pdfRes = await axios.get(`${API_URL}/reports/export-pdf`, {
        ...authHeader(),
        responseType: 'arraybuffer'
      });
      assert.strictEqual(pdfRes.status, 200);
      assert.ok(pdfRes.data.length > 1000, 'PDF buffer must contain real binary PDF content');
      const magic = Buffer.from(pdfRes.data.slice(0, 5)).toString();
      assert.strictEqual(magic, '%PDF-', 'PDF magic bytes must match %PDF-');
    } catch (err) {
      console.error('STEP 6 ERROR DETAIL:', err.response?.data || err.message);
      throw err;
    }
  });
});
