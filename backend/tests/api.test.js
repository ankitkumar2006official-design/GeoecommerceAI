const test = require('node:test');
const assert = require('node:assert');
const { connectDB, closeDB } = require('../config/db');
const User = require('../models/User');
const Sale = require('../models/Sale');
const { lookupPincode, getStateCentroid } = require('../utils/geoHelper');

test('GeoCommerce AI Core Test Suite', async (t) => {
  // Setup database connection
  await connectDB();

  await t.test('Authentication & Data Isolation: User Registration & Hashing', async () => {
    await User.deleteMany({ email: 'test_seller@geocommerce.ai' });
    const user = new User({
      name: 'Test Merchant',
      email: 'test_seller@geocommerce.ai',
      password: 'SecurePassword123!',
      storeName: 'Heritage Goods India'
    });
    await user.save();

    assert.ok(user._id, 'User ID should be generated');
    assert.notStrictEqual(user.password, 'SecurePassword123!', 'Password must be hashed with bcrypt');

    const isValid = await user.comparePassword('SecurePassword123!');
    assert.strictEqual(isValid, true, 'comparePassword must return true for correct password');

    const isInvalid = await user.comparePassword('WrongPassword');
    assert.strictEqual(isInvalid, false, 'comparePassword must return false for wrong password');
  });

  await t.test('Geo Lookup: Verified India PIN Code Resolution', async () => {
    const mumbaiGeo = lookupPincode('400001');
    assert.ok(mumbaiGeo, '400001 must resolve');
    assert.strictEqual(mumbaiGeo.city, 'Mumbai');
    assert.strictEqual(mumbaiGeo.state, 'Maharashtra');
    assert.ok(mumbaiGeo.lat > 18 && mumbaiGeo.lat < 20, 'Latitude should be in Mumbai region');

    const blrGeo = lookupPincode('560001');
    assert.ok(blrGeo, '560001 must resolve');
    assert.strictEqual(blrGeo.state, 'Karnataka');

    const kolkataGeo = lookupPincode('700001');
    assert.ok(kolkataGeo, '700001 must resolve');
    assert.strictEqual(kolkataGeo.city, 'Kolkata (BBD Bagh)');
    assert.strictEqual(kolkataGeo.state, 'West Bengal');

    const centroid = getStateCentroid('Maharashtra');
    assert.ok(centroid, 'Maharashtra centroid must exist');
    assert.strictEqual(centroid.code, 'MH');
  });

  await t.test('Sales Ingestion & Multi-Tenant Seller Isolation', async () => {
    const user1 = await User.findOne({ email: 'test_seller@geocommerce.ai' });
    
    // Create a second seller to verify isolation
    await User.deleteMany({ email: 'seller_two@geocommerce.ai' });
    const user2 = new User({
      name: 'Seller Two',
      email: 'seller_two@geocommerce.ai',
      password: 'Password999!',
      storeName: 'Second Store'
    });
    await user2.save();

    await Sale.deleteMany({ sellerId: { $in: [user1._id, user2._id] } });

    // Insert sales for user1
    await Sale.create([
      {
        sellerId: user1._id,
        orderId: 'ORD-T101',
        productId: 'PROD-E101',
        productName: 'AcousticBass Wireless Earbuds',
        category: 'Electronics',
        orderDate: new Date('2026-01-15'),
        pincode: '400001',
        city: 'Mumbai',
        state: 'Maharashtra',
        quantity: 2,
        sellingPrice: 1499,
        costPrice: 750,
        inventoryQuantity: 50
      },
      {
        sellerId: user1._id,
        orderId: 'ORD-T102',
        productId: 'PROD-F202',
        productName: 'VedicWeave Embroidered Cotton Kurti',
        category: 'Fashion',
        orderDate: new Date('2026-01-16'),
        pincode: '700001',
        city: 'Kolkata',
        state: 'West Bengal',
        quantity: 3,
        sellingPrice: 849,
        costPrice: 340,
        inventoryQuantity: 80
      }
    ]);

    // Insert sales for user2
    await Sale.create([
      {
        sellerId: user2._id,
        orderId: 'ORD-U201',
        productId: 'PROD-H301',
        productName: 'Air Fryer',
        category: 'Home & Kitchen',
        orderDate: new Date('2026-01-20'),
        pincode: '560001',
        city: 'Bengaluru',
        state: 'Karnataka',
        quantity: 1,
        sellingPrice: 4299,
        costPrice: 2100,
        inventoryQuantity: 20
      }
    ]);

    // Test isolation
    const user1Sales = await Sale.find({ sellerId: user1._id });
    const user2Sales = await Sale.find({ sellerId: user2._id });

    assert.strictEqual(user1Sales.length, 2, 'Seller 1 must strictly see only their 2 records');
    assert.strictEqual(user2Sales.length, 1, 'Seller 2 must strictly see only their 1 record');
    assert.strictEqual(user1Sales[0].productName, 'AcousticBass Wireless Earbuds');
    assert.strictEqual(user2Sales[0].productName, 'Air Fryer');
  });

  await t.test('Regional Demand Aggregations', async () => {
    const user1 = await User.findOne({ email: 'test_seller@geocommerce.ai' });
    const stateAgg = await Sale.aggregate([
      { $match: { sellerId: user1._id } },
      {
        $group: {
          _id: '$state',
          units: { $sum: '$quantity' },
          revenue: { $sum: { $multiply: ['$quantity', '$sellingPrice'] } }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    assert.strictEqual(stateAgg.length, 2, 'Should aggregate 2 distinct states for Seller 1');
    assert.strictEqual(stateAgg[0]._id, 'Maharashtra');
    assert.strictEqual(stateAgg[0].revenue, 2998); // 2 * 1499
    assert.strictEqual(stateAgg[1]._id, 'West Bengal');
    assert.strictEqual(stateAgg[1].revenue, 2547); // 3 * 849
  });

  await t.test('Database Connection Status Endpoint Safe Reporting', async () => {
    const { getDbStatus } = require('../config/db');
    const status = getDbStatus();
    assert.ok(status, 'Status object must exist');
    assert.strictEqual(typeof status.connected, 'boolean', 'connected must be boolean');
    assert.ok(status.status, 'status string must be present');
    assert.ok(status.mode, 'mode descriptor must be present');
    // Ensure no password or sensitive connection secrets are leaked
    const jsonStr = JSON.stringify(status);
    assert.ok(!jsonStr.includes('@'), 'Must not leak connection username/password');
    assert.ok(!jsonStr.includes('mongodb+srv://'), 'Must not expose raw mongodb URI');
  });

  await t.test('Complete Mongoose Schemas: Product, Order, Inventory, Analytics', async () => {
    const Product = require('../models/Product');
    const Order = require('../models/Order');
    const Inventory = require('../models/Inventory');
    const Analytics = require('../models/Analytics');

    const user1 = await User.findOne({ email: 'test_seller@geocommerce.ai' });

    // Product Schema verification
    await Product.deleteMany({ sellerId: user1._id });
    const product = new Product({
      sellerId: user1._id,
      productId: 'PROD-TEST-1',
      name: 'Wireless Ergonomic Keyboard',
      category: 'Electronics',
      costPrice: 800,
      sellingPrice: 1999,
      inventoryQuantity: 75
    });
    await product.save();
    assert.ok(product._id, 'Product document must save');
    assert.strictEqual(product.productId, 'PROD-TEST-1');

    // Order Schema verification
    await Order.deleteMany({ sellerId: user1._id });
    const order = new Order({
      sellerId: user1._id,
      orderId: 'ORD-TEST-99',
      orderDate: new Date('2026-02-01'),
      pincode: '400001',
      city: 'Mumbai',
      state: 'Maharashtra',
      items: [
        {
          productId: 'PROD-TEST-1',
          productName: 'Wireless Ergonomic Keyboard',
          category: 'Electronics',
          quantity: 2,
          price: 1999,
          cost: 800
        }
      ],
      totalAmount: 3998
    });
    await order.save();
    assert.ok(order._id, 'Order document must save');
    assert.strictEqual(order.orderId, 'ORD-TEST-99');
    assert.strictEqual(order.items.length, 1);

    // Inventory Schema verification
    await Inventory.deleteMany({ sellerId: user1._id });
    const inv = new Inventory({
      sellerId: user1._id,
      productId: 'PROD-TEST-1',
      productName: 'Wireless Ergonomic Keyboard',
      category: 'Electronics',
      currentStock: 75,
      unitCost: 800,
      unitPrice: 1999,
      status: 'Optimal'
    });
    await inv.save();
    assert.ok(inv._id, 'Inventory record must save');
    assert.strictEqual(inv.status, 'Optimal');

    // Analytics Snapshot Schema verification
    await Analytics.deleteMany({ sellerId: user1._id });
    const snap = new Analytics({
      sellerId: user1._id,
      snapshotDate: new Date(),
      period: 'ALL_TIME',
      totalRevenue: 3998,
      totalUnits: 2,
      totalOrders: 1,
      grossProfit: 2398,
      profitMarginPct: 60.0
    });
    await snap.save();
    assert.ok(snap._id, 'Analytics snapshot must save');
    assert.strictEqual(snap.totalRevenue, 3998);
  });

  await t.test('Gemini Service & Grounded Business Copilot', async () => {
    const { generateCopilotResponse, AnalyticsGrounding } = require('../services/geminiService');
    const user1 = await User.findOne({ email: 'test_seller@geocommerce.ai' });

    // Test MongoDB factual grounding helper
    const overview = await AnalyticsGrounding.getOverview(user1._id);
    assert.ok(overview, 'Overview facts should be computed');
    assert.ok(overview.totalRevenueINR > 0, 'Total revenue should be positive');

    // Test regional inquiry response
    const response = await generateCopilotResponse(user1._id, 'Which products sell the most in Mumbai?');
    assert.ok(response, 'Response should not be empty');
    assert.ok(response.reply, 'Reply must be generated');
    assert.strictEqual(response.hasData, true, 'hasData flag must be true');
    assert.ok(response.reply.includes('MUMBAI') || response.reply.includes('Mumbai'), 'Reply must address Mumbai');
  });

  // Teardown
  await closeDB();
});

