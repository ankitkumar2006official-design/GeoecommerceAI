const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const axios = require('../backend/node_modules/axios');
const FormData = require('../backend/node_modules/form-data');

const API_URL = 'http://127.0.0.1:5000/api';

test('GeoCommerce AI - Complete 14-Step Seller Journey E2E Test', async (t) => {
  let sellerToken = '';
  let sellerId = '';
  let token2 = '';
  let sellerEmail = `seller_audit_${Date.now()}@ecomtest.in`;
  let sellerPassword = 'SecurePassword2026!';

  // Helper for auth headers
  const authHeader = () => ({
    headers: { Authorization: `Bearer ${sellerToken}` }
  });

  // -------------------------------------------------------------
  // STEP 1: Seller Registration and Authentication
  // -------------------------------------------------------------
  await t.test('1. Seller Registration, Hashing & JWT Authentication', async () => {
    // 1.1 Register
    const regRes = await axios.post(`${API_URL}/auth/register`, {
      name: 'Aditi Sharma',
      email: sellerEmail,
      password: sellerPassword,
      storeName: 'Sharma Heritage Retail'
    });
    assert.strictEqual(regRes.status, 201);
    assert.ok(regRes.data.token, 'Registration must yield JWT token');
    assert.ok(regRes.data.user.id, 'Registration must yield user ID');
    sellerToken = regRes.data.token;
    sellerId = regRes.data.user.id;

    // 1.2 Login with valid credentials
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: sellerEmail,
      password: sellerPassword
    });
    assert.strictEqual(loginRes.status, 200);
    assert.ok(loginRes.data.token, 'Login must return valid JWT token');

    // 1.3 Reject invalid password
    await assert.rejects(
      async () => {
        await axios.post(`${API_URL}/auth/login`, {
          email: sellerEmail,
          password: 'IncorrectPassword999'
        });
      },
      (err) => err.response?.status === 401,
      'Invalid password must be rejected with 401 Unauthorized'
    );
  });

  // -------------------------------------------------------------
  // STEP 2 & 3: Sales Upload, Validation & Selling Price Parser Fix
  // -------------------------------------------------------------
  await t.test('2 & 3. Sales CSV Upload, Data Validation & Header Normalization', async () => {
    // 2.1 First test corrupted file rejection
    const invalidCsvContent = [
      'Order ID,Product ID,Product Name,Product Category,Order Date,Delivery PIN Code,Quantity,Selling Price',
      'ORD-BAD-1,PROD-1,Valid Item,Electronics,2026-01-01,400001,-5,1000', // negative qty
      'ORD-BAD-2,PROD-1,Valid Item,Electronics,invalid-date,400001,2,1000', // invalid date
      'ORD-BAD-3,PROD-1,Valid Item,Electronics,2026-01-01,999,2,1000', // bad pincode
      'ORD-BAD-4,PROD-1,Valid Item,Electronics,2026-01-01,400001,2,-50' // negative price
    ].join('\n');

    const invalidForm = new FormData();
    invalidForm.append('file', Buffer.from(invalidCsvContent), {
      filename: 'corrupted_sales.csv',
      contentType: 'text/csv'
    });

    const invalidUploadRes = await axios.post(`${API_URL}/sales/upload`, invalidForm, {
      headers: {
        ...authHeader().headers,
        ...invalidForm.getHeaders()
      }
    });

    assert.strictEqual(invalidUploadRes.status, 200);
    assert.ok(invalidUploadRes.data.summary.rejectedRows >= 4, 'Must reject all 4 corrupted rows');
    assert.strictEqual(invalidUploadRes.data.summary.validImported, 0, 'No corrupted rows should be imported');
    assert.ok(invalidUploadRes.data.errors.length >= 4, 'Error audit reasons must be detailed');

    // 2.2 Now upload the corrected 800-record dataset
    const csv800Path = path.resolve(__dirname, '../data/sample_sales_data_800.csv');
    assert.ok(fs.existsSync(csv800Path), 'sample_sales_data_800.csv must exist');

    const validForm = new FormData();
    validForm.append('file', fs.createReadStream(csv800Path), {
      filename: 'sample_sales_data_800.csv',
      contentType: 'text/csv'
    });

    const upload800Res = await axios.post(`${API_URL}/sales/upload`, validForm, {
      headers: {
        ...authHeader().headers,
        ...validForm.getHeaders()
      }
    });

    assert.strictEqual(upload800Res.status, 200);
    assert.strictEqual(upload800Res.data.summary.validImported, 800, 'All 800 records must be successfully imported');
    assert.strictEqual(upload800Res.data.summary.rejectedRows, 0, 'Zero rows should be rejected for Selling Price or format issues');

    // 2.3 Duplicate detection test: re-upload the same file
    const dupForm = new FormData();
    dupForm.append('file', fs.createReadStream(csv800Path), {
      filename: 'sample_sales_data_800.csv',
      contentType: 'text/csv'
    });

    const dupUploadRes = await axios.post(`${API_URL}/sales/upload`, dupForm, {
      headers: {
        ...authHeader().headers,
        ...dupForm.getHeaders()
      }
    });

    assert.strictEqual(dupUploadRes.status, 200);
    assert.strictEqual(dupUploadRes.data.summary.validImported, 0, 'Duplicate records must not be re-imported');
    assert.strictEqual(dupUploadRes.data.summary.duplicateRows, 800, 'All 800 records should be flagged as duplicates');
  });

  // -------------------------------------------------------------
  // STEP 4: Database Storage & Multi-Tenant Seller Isolation
  // -------------------------------------------------------------
  await t.test('4. Database Storage & Seller Isolation', async () => {
    // Register second seller
    const otherSellerEmail = `isolated_seller_${Date.now()}@ecomtest.in`;
    const regRes2 = await axios.post(`${API_URL}/auth/register`, {
      name: 'Second Merchant',
      email: otherSellerEmail,
      password: 'OtherPassword123!',
      storeName: 'Competitor Store'
    });
    token2 = regRes2.data.token;

    // Second seller has NO data
    const secondSellerRes = await axios.get(`${API_URL}/analytics/overview`, {
      headers: { Authorization: `Bearer ${token2}` }
    });
    assert.strictEqual(secondSellerRes.data.totalRevenue, 0, 'Second seller must see 0 revenue (isolated)');
    assert.strictEqual(secondSellerRes.data.totalUnits, 0, 'Second seller must see 0 units');
    assert.strictEqual(secondSellerRes.data.hasData, false);

    // First seller has 800 records
    const firstSellerRes = await axios.get(`${API_URL}/analytics/overview`, authHeader());
    assert.strictEqual(firstSellerRes.data.hasData, true, 'First seller must see active dataset');
    assert.ok(firstSellerRes.data.totalRevenue > 500000, 'First seller revenue must be calculated from 800 records');
  });

  // -------------------------------------------------------------
  // STEP 5: Sales Analytics Dashboard Calculations
  // -------------------------------------------------------------
  await t.test('5. Sales Analytics Dashboard Mathematical Verification', async () => {
    const res = await axios.get(`${API_URL}/analytics/overview`, authHeader());
    assert.strictEqual(res.status, 200);

    const d = res.data;
    assert.ok(d.totalRevenue > 0, 'Total Revenue must be positive');
    assert.ok(d.totalUnits >= 800, 'Total Units must be >= 800 (accounting for quantities >= 1)');
    assert.ok(d.totalOrdersCount > 400, 'Orders count must be correctly identified');
    assert.ok(d.grossProfit > 0, 'Gross profit must be positive');
    assert.ok(d.profitMarginPct > 0 && d.profitMarginPct < 100, 'Profit margin % must be between 0 and 100%');
    assert.ok(d.distinctStatesCount >= 15, 'States covered must span 15+ Indian states');
    assert.ok(d.monthlyTrend.length >= 5, 'Monthly trend must contain trend points');
    assert.ok(d.categoryDistribution.length >= 4, 'Categories must span Electronics, Fashion, etc.');
  });

  // -------------------------------------------------------------
  // STEP 6: Interactive Regional Demand Map
  // -------------------------------------------------------------
  await t.test('6. Interactive Regional Demand Map Pinpoints', async () => {
    const res = await axios.get(`${API_URL}/analytics/map-data`, authHeader());
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.points.length > 20, 'Map must contain 20+ PIN code coordinates');

    for (const pt of res.data.points) {
      assert.ok(pt.pincode && /^\d{6}$/.test(pt.pincode), 'PIN must be 6 digits');
      assert.ok(pt.lat >= 8.0 && pt.lat <= 38.0, `Latitude ${pt.lat} must be within India`);
      assert.ok(pt.lng >= 68.0 && pt.lng <= 98.0, `Longitude ${pt.lng} must be within India`);
      assert.ok(pt.units > 0, 'Pinpoint units must be positive');
      assert.ok(pt.revenue > 0, 'Pinpoint revenue must be positive');
      assert.ok(pt.topProduct, 'Must identify top product for that coordinate');
    }
  });

  // -------------------------------------------------------------
  // STEP 7: Product & Regional Rankings
  // -------------------------------------------------------------
  await t.test('7. Regional & Catalog Product Rankings', async () => {
    // 7.1 State rankings
    const regRes = await axios.get(`${API_URL}/analytics/regional-demand?level=state`, authHeader());
    assert.strictEqual(regRes.status, 200);
    assert.ok(regRes.data.regions.length > 5, 'Must rank multiple states');
    assert.ok(regRes.data.regions[0].totalUnits >= regRes.data.regions[1].totalUnits, 'States must be sorted descending by units');

    // 7.2 Product rankings
    const prodRes = await axios.get(`${API_URL}/analytics/product-analytics`, authHeader());
    assert.strictEqual(prodRes.status, 200);
    assert.ok(prodRes.data.products.length >= 10, 'Must rank top 10+ products');
    assert.ok(prodRes.data.products[0].unitsSold >= prodRes.data.products[1].unitsSold, 'Products must be sorted descending');
  });

  // -------------------------------------------------------------
  // STEP 8: ML Demand Forecasting (7, 30, 90 Days)
  // -------------------------------------------------------------
  await t.test('8. Machine Learning Demand Forecasting', async () => {
    // 30-day forecast
    const fc30 = await axios.post(`${API_URL}/ml/forecast`, { horizonDays: 30 }, authHeader());
    assert.strictEqual(fc30.status, 200);
    assert.ok(fc30.data.aggregates, 'Forecast aggregates must exist');
    assert.strictEqual(fc30.data.horizon_days, 30);
    assert.ok(fc30.data.aggregates.forecast_total_units > 0, 'Projected 30-day units must be positive');
    assert.ok(fc30.data.metrics.model_rmse !== undefined, 'Model RMSE must be evaluated against baseline');

    // 7-day forecast
    const fc7 = await axios.post(`${API_URL}/ml/forecast`, { horizonDays: 7 }, authHeader());
    assert.strictEqual(fc7.status, 200);
    assert.strictEqual(fc7.data.horizon_days, 7);

    // 90-day forecast
    const fc90 = await axios.post(`${API_URL}/ml/forecast`, { horizonDays: 90 }, authHeader());
    assert.strictEqual(fc90.status, 200);
    assert.strictEqual(fc90.data.horizon_days, 90);
  });

  // -------------------------------------------------------------
  // STEP 9: Smart Inventory Optimization
  // -------------------------------------------------------------
  await t.test('9. Smart Inventory Optimization & Dead Stock Prevention', async () => {
    const invRes = await axios.post(`${API_URL}/ml/inventory-optimizer`, { leadTimeDays: 7 }, authHeader());
    assert.strictEqual(invRes.status, 200);
    assert.ok(invRes.data.inventory_items.length > 0, 'Must evaluate inventory items');

    const first = invRes.data.inventory_items[0];
    assert.ok(first.product_name, 'Product name must be present');
    assert.ok(first.current_stock !== undefined, 'Current stock must be present');
    assert.ok(first.safety_stock !== undefined, 'Safety stock must be calculated');
    assert.ok(first.reorder_point !== undefined, 'Reorder point must be calculated');
    assert.ok(first.stockout_risk, 'Stockout risk status must be evaluated');

    // Dead stock audit
    assert.ok(Array.isArray(invRes.data.dead_stock_items), 'Dead stock list must be an array');
    assert.ok(Array.isArray(invRes.data.recommended_transfers), 'Inter-warehouse transfer list must exist');
  });

  // -------------------------------------------------------------
  // STEP 10: Market Opportunity Analysis
  // -------------------------------------------------------------
  await t.test('10. AI Regional Opportunity Scoring', async () => {
    const oppRes = await axios.post(`${API_URL}/ml/opportunity-score`, { groupBy: 'state' }, authHeader());
    assert.strictEqual(oppRes.status, 200);
    assert.ok(oppRes.data.results.length > 0, 'Opportunity results must be computed');

    const topOpp = oppRes.data.results[0];
    assert.ok(topOpp.opportunity_score >= 0 && topOpp.opportunity_score <= 100, 'Score must be 0-100');
    assert.ok(topOpp.confidence, 'Confidence level must be provided');
    assert.ok(topOpp.recommended_action, 'Actionable recommendation must be provided');
  });

  // -------------------------------------------------------------
  // STEP 11: Gemini AI Business Copilot
  // -------------------------------------------------------------
  await t.test('11. Gemini AI Business Copilot Grounded Querying', async () => {
    // 11.1 Query location demand
    const copilotRes = await axios.post(
      `${API_URL}/ai/chat`,
      { prompt: 'Which products are selling the most in Maharashtra and what should I stock?' },
      authHeader()
    );
    assert.strictEqual(copilotRes.status, 200);
    assert.ok(copilotRes.data.reply, 'Reply must exist');
    assert.strictEqual(copilotRes.data.hasData, true);
    assert.ok(copilotRes.data.groundedData, 'Grounded data must be attached');
    assert.ok(copilotRes.data.reply.length > 50, 'Reply must be comprehensive and executive');

    // 11.2 Query with empty seller to test insufficient data handling
    const emptySellerRes = await axios.post(
      `${API_URL}/ai/chat`,
      { prompt: 'What are my top selling items?' },
      { headers: { Authorization: `Bearer ${token2}` } }
    );
    assert.strictEqual(emptySellerRes.status, 200);
    assert.strictEqual(emptySellerRes.data.hasData, false);
    assert.ok(emptySellerRes.data.reply.includes("haven't uploaded any sales data"));
  });

  // -------------------------------------------------------------
  // STEP 12: What-If Business Simulator
  // -------------------------------------------------------------
  await t.test('12. What-If Business Simulator Scenarios', async () => {
    // Run simulation
    const simRes = await axios.post(
      `${API_URL}/scenarios/simulate`,
      {
        priceChangePct: -10,
        inventoryChangePct: 25,
        adSpendChangePct: 20,
        targetRegion: 'All',
        targetCategory: 'All'
      },
      authHeader()
    );
    assert.strictEqual(simRes.status, 200);
    assert.ok(simRes.data.baseline.revenue > 0, 'Baseline revenue must be computed');
    assert.ok(simRes.data.simulated.projectedRevenue > 0, 'Projected revenue must be simulated');
    assert.ok(simRes.data.simulated.revenueDelta !== undefined, 'Revenue delta must be provided');
    assert.ok(simRes.data.disclaimer.includes('elasticity'), 'Methodology disclaimer must be present');

    // Save scenario
    const saveRes = await axios.post(
      `${API_URL}/scenarios/save`,
      {
        name: 'Festive Season 10% Discount Strategy',
        parameters: simRes.data.parameters,
        projectedMetrics: simRes.data.simulated
      },
      authHeader()
    );
    assert.strictEqual(saveRes.status, 201);
    assert.ok(saveRes.data.scenario._id, 'Saved scenario must have DB ID');

    // Retrieve saved scenarios
    const getScenariosRes = await axios.get(`${API_URL}/scenarios/saved`, authHeader());
    assert.strictEqual(getScenariosRes.status, 200);
    assert.ok(getScenariosRes.data.scenarios.length >= 1, 'Saved scenarios list must return scenario');
  });

  // -------------------------------------------------------------
  // STEP 13: Report Generation (CSV & PDF)
  // -------------------------------------------------------------
  await t.test('13. Comprehensive Report Generation', async () => {
    // CSV Export
    const csvExport = await axios.get(`${API_URL}/reports/export-csv`, {
      ...authHeader(),
      responseType: 'text'
    });
    assert.strictEqual(csvExport.status, 200);
    assert.ok(csvExport.data.startsWith('Order ID,Product ID,Product Name'), 'CSV header must be present');
    assert.ok(csvExport.data.includes('AcousticBass Wireless Earbuds') || csvExport.data.includes('PROD-'), 'CSV must contain data records');

    // PDF Export
    const pdfExport = await axios.get(`${API_URL}/reports/export-pdf`, {
      ...authHeader(),
      responseType: 'arraybuffer'
    });
    assert.strictEqual(pdfExport.status, 200);
    const magic = Buffer.from(pdfExport.data.slice(0, 5)).toString();
    assert.strictEqual(magic, '%PDF-', 'PDF magic bytes %PDF- must be valid binary format');
    assert.ok(pdfExport.data.length > 5000, 'PDF size must be substantial (>5KB)');
  });

  // -------------------------------------------------------------
  // STEP 14: Logout & Data Persistence
  // -------------------------------------------------------------
  await t.test('14. Logout & Multi-Session Data Persistence', async () => {
    // Simulate logout (client forgets token)
    sellerToken = '';

    // Re-authenticate as the seller
    const reLoginRes = await axios.post(`${API_URL}/auth/login`, {
      email: sellerEmail,
      password: sellerPassword
    });
    assert.strictEqual(reLoginRes.status, 200);
    sellerToken = reLoginRes.data.token;

    // Verify all 800 records and analytics persist intact
    const reOverview = await axios.get(`${API_URL}/analytics/overview`, authHeader());
    assert.strictEqual(reOverview.status, 200);
    assert.strictEqual(reOverview.data.hasData, true, 'Data must persist across sessions');
    assert.ok(reOverview.data.totalRevenue > 500000, 'Persisted revenue must match original upload');
  });
});
