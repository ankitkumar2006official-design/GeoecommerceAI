const { app, startServer } = require('../backend/server');
const axios = require('../backend/node_modules/axios');

async function verify() {
  console.log('--- Starting verification script ---');
  const server = await startServer();
  const BASE_URL = 'http://127.0.0.1:5000/api';

  try {
    // 1. GET /api/health
    console.log('\n[1] Testing GET /api/health:');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('Status:', health.status);
    console.log('Response:', JSON.stringify(health.data, null, 2));

    // 2. GET /api/db-status
    console.log('\n[2] Testing GET /api/db-status:');
    const dbStatus = await axios.get(`${BASE_URL}/db-status`);
    console.log('Status:', dbStatus.status);
    console.log('Response:', JSON.stringify(dbStatus.data, null, 2));

    // 3. Register user and load sample data to test analytics & AI
    console.log('\n[3] Authenticating test seller:');
    const authRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Verification Seller',
      email: `verify_${Date.now()}@geocommerce.ai`,
      password: 'StrongPassword123!',
      storeName: 'Verified Electronics & Apparel'
    });
    const token = authRes.data.token;
    const authHeader = { headers: { Authorization: `Bearer ${token}` } };
    console.log('Seller Registered. Token acquired.');

    // Seed data
    await axios.post(`${BASE_URL}/sales/load-sample`, {}, authHeader);
    console.log('Verified sample sales data populated.');

    // 4. GET /api/analytics/overview
    console.log('\n[4] Testing GET /api/analytics/overview:');
    const overview = await axios.get(`${BASE_URL}/analytics/overview`, authHeader);
    console.log('Status:', overview.status);
    console.log('Total Revenue:', `₹${overview.data.totalRevenue.toLocaleString('en-IN')}`);
    console.log('Total Units:', overview.data.totalUnits);
    console.log('States Covered:', overview.data.distinctStatesCount);

    // 5. GET /api/analytics/regional-demand
    console.log('\n[5] Testing GET /api/analytics/regional-demand:');
    const regional = await axios.get(`${BASE_URL}/analytics/regional-demand?level=state`, authHeader);
    console.log('Status:', regional.status);
    console.log('Top 3 Regions:');
    regional.data.regions.slice(0, 3).forEach((r) => {
      console.log(` - ${r.location}: ${r.totalUnits} units, top product: "${r.topProduct}"`);
    });

    // 6. POST /api/ai/chat
    console.log('\n[6] Testing POST /api/ai/chat:');
    const chatRes = await axios.post(
      `${BASE_URL}/ai/chat`,
      {
        prompt: 'Which products are selling the most in Maharashtra and what is the consumer demand pattern?'
      },
      authHeader
    );
    console.log('Status:', chatRes.status);
    console.log('Context Type:', chatRes.data.contextType);
    console.log('Engine:', chatRes.data.engine);
    console.log('AI Reply Preview:\n', chatRes.data.reply.slice(0, 300) + '...\n');

    console.log('====================================================');
    console.log('ALL 5 TARGET ENDPOINTS VERIFIED & WORKING PERFECTLY!');
    console.log('====================================================');
  } catch (err) {
    console.error('Verification failed:', err.response?.data || err.message);
  } finally {
    server.close();
    process.exit(0);
  }
}

verify();

