const { GoogleGenAI } = require('@google/genai');
const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const UploadLog = require('../models/UploadLog');
const { resolveActiveDatasetId } = require('./datasetService');
const { getSellerSalesData, dispatchMlRequest } = require('../controllers/mlProxyController');

// Centralized Gemini Client
let geminiClient = null;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_existing_key' || apiKey === 'your_gemini_api_key_here') {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

// Analytics Grounding Tools strictly isolated by sellerId and active datasetId
const AnalyticsGrounding = {
  /**
   * 1. Overview Analytics: Revenue, units, orders, profit, return rate
   */
  async getOverview(sellerId, datasetId) {
    const sId = new mongoose.Types.ObjectId(sellerId);
    const match = { sellerId: sId };
    if (datasetId) match.datasetId = datasetId;

    const totalRecords = await Sale.countDocuments(match);

    const [stats] = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          grossRevenue: { $sum: { $multiply: ['$quantity', '$sellingPrice'] } },
          grossUnits: { $sum: '$quantity' },
          totalCost: { $sum: { $multiply: ['$quantity', '$costPrice'] } },
          distinctOrders: { $addToSet: '$orderId' },
          distinctStates: { $addToSet: '$state' },
          distinctCities: { $addToSet: '$city' },
          distinctProducts: { $addToSet: '$productId' },
          returnsCount: {
            $sum: {
              $cond: [{ $in: [{ $toLower: '$returnStatus' }, ['returned', 'yes', 'true']] }, 1, 0]
            }
          },
          returnedUnits: {
            $sum: {
              $cond: [{ $in: [{ $toLower: '$returnStatus' }, ['returned', 'yes', 'true']] }, '$quantity', 0]
            }
          },
          returnedRevenue: {
            $sum: {
              $cond: [
                { $in: [{ $toLower: '$returnStatus' }, ['returned', 'yes', 'true']] },
                { $multiply: ['$quantity', '$sellingPrice'] },
                0
              ]
            }
          },
          cancellationsCount: {
            $sum: {
              $cond: [{ $in: [{ $toLower: '$cancellationStatus' }, ['cancelled', 'yes', 'true']] }, 1, 0]
            }
          },
          cancelledUnits: {
            $sum: {
              $cond: [{ $in: [{ $toLower: '$cancellationStatus' }, ['cancelled', 'yes', 'true']] }, '$quantity', 0]
            }
          },
          cancelledRevenue: {
            $sum: {
              $cond: [
                { $in: [{ $toLower: '$cancellationStatus' }, ['cancelled', 'yes', 'true']] },
                { $multiply: ['$quantity', '$sellingPrice'] },
                0
              ]
            }
          },
          netDeliveredUnits: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $not: [{ $in: [{ $toLower: '$returnStatus' }, ['returned', 'yes', 'true']] }] },
                    { $not: [{ $in: [{ $toLower: '$cancellationStatus' }, ['cancelled', 'yes', 'true']] }] }
                  ]
                },
                '$quantity',
                0
              ]
            }
          },
          netDeliveredRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $not: [{ $in: [{ $toLower: '$returnStatus' }, ['returned', 'yes', 'true']] }] },
                    { $not: [{ $in: [{ $toLower: '$cancellationStatus' }, ['cancelled', 'yes', 'true']] }] }
                  ]
                },
                { $multiply: ['$quantity', '$sellingPrice'] },
                0
              ]
            }
          },
          totalRecords: { $sum: 1 }
        }
      }
    ]);
    if (!stats) return null;

    const grossProfit = stats.netDeliveredRevenue - stats.totalCost;
    const marginPct = stats.netDeliveredRevenue > 0 ? (grossProfit / stats.netDeliveredRevenue) * 100 : 0;
    const returnRatePct = stats.totalRecords > 0 ? (stats.returnsCount / stats.totalRecords) * 100 : 0;
    const cancelRatePct = stats.totalRecords > 0 ? (stats.cancellationsCount / stats.totalRecords) * 100 : 0;

    return {
      totalRevenueINR: Math.round(stats.netDeliveredRevenue > 0 ? stats.netDeliveredRevenue : stats.grossRevenue),
      netRevenueINR: Math.round(stats.netDeliveredRevenue),
      grossRevenueINR: Math.round(stats.grossRevenue),
      totalUnitsSold: stats.netDeliveredUnits > 0 ? stats.netDeliveredUnits : stats.grossUnits,
      netUnitsSold: stats.netDeliveredUnits,
      grossUnitsSold: stats.grossUnits,
      returnedUnits: stats.returnedUnits,
      cancelledUnits: stats.cancelledUnits,
      totalOrdersCount: stats.distinctOrders.length,
      grossProfitINR: Math.round(grossProfit),
      grossProfitMarginPct: Math.round(marginPct * 10) / 10,
      activeStatesCovered: stats.distinctStates.length,
      activeCitiesCovered: stats.distinctCities.length,
      activeSkusCount: stats.distinctProducts.length,
      returnRatePct: Math.round(returnRatePct * 10) / 10,
      cancellationRatePct: Math.round(cancelRatePct * 10) / 10,
      totalSalesRecords: stats.totalRecords,
      debug: {
        sellerId: String(sellerId),
        activeDatasetId: datasetId,
        matchedRecordsCount: stats.totalRecords,
        totalDatasetRecords: totalRecords,
        filtersUsed: match,
        calculations: {
          revenueFormula: 'Quantity * Selling Price (INR)',
          netDeliveredCondition: "returnStatus NOT IN ['returned', 'yes', 'true'] AND cancellationStatus NOT IN ['cancelled', 'yes', 'true']"
        }
      }
    };
  },

  /**
   * 2. Regional Demand & Location Verification
   * Strictly checks if location exists in active dataset. Calculates net fulfilled & gross stats.
   */
  async getTopProductsByLocation(sellerId, datasetId, location, limit = 5) {
    const sId = new mongoose.Types.ObjectId(sellerId);
    const match = { sellerId: sId };
    if (datasetId) match.datasetId = datasetId;

    const totalInDataset = await Sale.countDocuments(match);
    const cleanLoc = location ? String(location).trim() : '';

    let locationMatch = { ...match };
    if (cleanLoc) {
      const locRegex = new RegExp(`^${cleanLoc}$|\\b${cleanLoc}\\b`, 'i');
      locationMatch = {
        ...match,
        $or: [{ city: locRegex }, { state: locRegex }, { district: locRegex }]
      };
    }

    const matchingCount = await Sale.countDocuments(locationMatch);

    if (matchingCount === 0 && cleanLoc) {
      const availableCities = await Sale.distinct('city', match);
      const availableStates = await Sale.distinct('state', match);
      return {
        found: false,
        requestedLocation: cleanLoc,
        message: `No sales data is available for ${cleanLoc} in your active sales dataset.`,
        availableCities: availableCities.filter(Boolean).slice(0, 15),
        availableStates: availableStates.filter(Boolean).slice(0, 10),
        matchedRecordsCount: 0,
        totalDatasetRecords: totalInDataset,
        filterQuery: locationMatch,
        products: [],
        debug: {
          sellerId: String(sellerId),
          datasetId,
          queriedLocation: cleanLoc,
          matchedRecordsCount: 0,
          totalDatasetRecords: totalInDataset,
          filtersUsed: locationMatch,
          rawResults: []
        }
      };
    }

    const pipeline = [
      { $match: locationMatch },
      {
        $group: {
          _id: '$productName',
          productId: { $first: '$productId' },
          category: { $first: '$category' },
          grossUnits: { $sum: '$quantity' },
          grossRevenue: { $sum: { $multiply: ['$quantity', '$sellingPrice'] } },
          orderCount: { $sum: 1 },
          returnedUnits: {
            $sum: {
              $cond: [{ $in: [{ $toLower: '$returnStatus' }, ['returned', 'yes', 'true']] }, '$quantity', 0]
            }
          },
          returnedRevenue: {
            $sum: {
              $cond: [
                { $in: [{ $toLower: '$returnStatus' }, ['returned', 'yes', 'true']] },
                { $multiply: ['$quantity', '$sellingPrice'] },
                0
              ]
            }
          },
          cancelledUnits: {
            $sum: {
              $cond: [{ $in: [{ $toLower: '$cancellationStatus' }, ['cancelled', 'yes', 'true']] }, '$quantity', 0]
            }
          },
          cancelledRevenue: {
            $sum: {
              $cond: [
                { $in: [{ $toLower: '$cancellationStatus' }, ['cancelled', 'yes', 'true']] },
                { $multiply: ['$quantity', '$sellingPrice'] },
                0
              ]
            }
          },
          netUnits: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $not: [{ $in: [{ $toLower: '$returnStatus' }, ['returned', 'yes', 'true']] }] },
                    { $not: [{ $in: [{ $toLower: '$cancellationStatus' }, ['cancelled', 'yes', 'true']] }] }
                  ]
                },
                '$quantity',
                0
              ]
            }
          },
          netRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $not: [{ $in: [{ $toLower: '$returnStatus' }, ['returned', 'yes', 'true']] }] },
                    { $not: [{ $in: [{ $toLower: '$cancellationStatus' }, ['cancelled', 'yes', 'true']] }] }
                  ]
                },
                { $multiply: ['$quantity', '$sellingPrice'] },
                0
              ]
            }
          },
          avgSellingPrice: { $avg: '$sellingPrice' },
          cities: { $addToSet: '$city' },
          states: { $addToSet: '$state' }
        }
      },
      { $sort: { netUnits: -1, grossUnits: -1 } },
      { $limit: limit }
    ];

    const rawResults = await Sale.aggregate(pipeline);

    const totalGrossUnits = rawResults.reduce((acc, i) => acc + i.grossUnits, 0);
    const totalGrossRevenue = rawResults.reduce((acc, i) => acc + i.grossRevenue, 0);
    const totalNetUnits = rawResults.reduce((acc, i) => acc + i.netUnits, 0);
    const totalNetRevenue = rawResults.reduce((acc, i) => acc + i.netRevenue, 0);

    const products = rawResults.map((i) => ({
      productName: i._id,
      productId: i.productId,
      category: i.category,
      unitsSold: i.netUnits > 0 ? i.netUnits : i.grossUnits,
      netUnits: i.netUnits,
      grossUnits: i.grossUnits,
      returnedUnits: i.returnedUnits,
      cancelledUnits: i.cancelledUnits,
      totalRevenueINR: Math.round(i.netRevenue > 0 ? i.netRevenue : i.grossRevenue),
      netRevenueINR: Math.round(i.netRevenue),
      grossRevenueINR: Math.round(i.grossRevenue),
      avgSellingPrice: Math.round(i.avgSellingPrice),
      orderCount: i.orderCount
    }));

    return {
      found: products.length > 0,
      requestedLocation: cleanLoc || 'All Active Regions',
      totalUnitsInLocation: totalNetUnits > 0 ? totalNetUnits : totalGrossUnits,
      totalNetUnits,
      totalGrossUnits,
      totalRevenueInLocationINR: Math.round(totalNetRevenue > 0 ? totalNetRevenue : totalGrossRevenue),
      totalNetRevenueINR: Math.round(totalNetRevenue),
      totalGrossRevenueINR: Math.round(totalGrossRevenue),
      matchedRecordsCount: matchingCount,
      totalDatasetRecords: totalInDataset,
      filterQuery: locationMatch,
      products,
      debug: {
        sellerId: String(sellerId),
        activeDatasetId: datasetId,
        queriedLocation: cleanLoc || 'All Active Regions',
        matchedRecordsCount: matchingCount,
        totalDatasetRecords: totalInDataset,
        filtersUsed: {
          sellerId: String(sellerId),
          datasetId,
          ...(cleanLoc ? { location: cleanLoc } : {})
        },
        calculationFormulas: {
          revenue: 'Quantity * Selling Price (INR)',
          netDeliveredCondition: "returnStatus NOT IN ['returned', 'yes', 'true'] AND cancellationStatus NOT IN ['cancelled', 'yes', 'true']",
          grossCondition: 'All matching transaction rows in active dataset'
        },
        rawAggregationResults: rawResults
      }
    };
  },

  /**
   * 3. Price-Based Product Filtering (e.g. "pricing more than 1400", "under 500", "between 500 and 1500")
   */
  async getPriceFilteredProducts(sellerId, datasetId, { minPrice, maxPrice, sortBy = 'unitsSold', limit = 10 }) {
    const sId = new mongoose.Types.ObjectId(sellerId);
    const match = { sellerId: sId };
    if (datasetId) match.datasetId = datasetId;

    const totalInDataset = await Sale.countDocuments(match);

    if (minPrice !== undefined && minPrice !== null) {
      match.sellingPrice = { ...(match.sellingPrice || {}), $gte: Number(minPrice) };
    }
    if (maxPrice !== undefined && maxPrice !== null) {
      match.sellingPrice = { ...(match.sellingPrice || {}), $lte: Number(maxPrice) };
    }

    const matchedRecords = await Sale.countDocuments(match);

    const sortObj = {};
    if (sortBy === 'revenue') sortObj.netRevenue = -1;
    else if (sortBy === 'price') sortObj.sellingPrice = -1;
    else sortObj.netUnits = -1;

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: '$productName',
          productId: { $first: '$productId' },
          category: { $first: '$category' },
          sellingPrice: { $avg: '$sellingPrice' },
          minPriceSeen: { $min: '$sellingPrice' },
          maxPriceSeen: { $max: '$sellingPrice' },
          grossUnits: { $sum: '$quantity' },
          grossRevenue: { $sum: { $multiply: ['$quantity', '$sellingPrice'] } },
          returnedUnits: {
            $sum: {
              $cond: [{ $in: [{ $toLower: '$returnStatus' }, ['returned', 'yes', 'true']] }, '$quantity', 0]
            }
          },
          cancelledUnits: {
            $sum: {
              $cond: [{ $in: [{ $toLower: '$cancellationStatus' }, ['cancelled', 'yes', 'true']] }, '$quantity', 0]
            }
          },
          netUnits: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $not: [{ $in: [{ $toLower: '$returnStatus' }, ['returned', 'yes', 'true']] }] },
                    { $not: [{ $in: [{ $toLower: '$cancellationStatus' }, ['cancelled', 'yes', 'true']] }] }
                  ]
                },
                '$quantity',
                0
              ]
            }
          },
          netRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $not: [{ $in: [{ $toLower: '$returnStatus' }, ['returned', 'yes', 'true']] }] },
                    { $not: [{ $in: [{ $toLower: '$cancellationStatus' }, ['cancelled', 'yes', 'true']] }] }
                  ]
                },
                { $multiply: ['$quantity', '$sellingPrice'] },
                0
              ]
            }
          },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: sortObj },
      { $limit: limit }
    ];

    const rawResults = await Sale.aggregate(pipeline);

    return {
      found: rawResults.length > 0,
      filterCriteria: {
        minPrice: minPrice !== undefined ? minPrice : null,
        maxPrice: maxPrice !== undefined ? maxPrice : null,
        sortBy
      },
      count: rawResults.length,
      matchedRecordsCount: matchedRecords,
      totalDatasetRecords: totalInDataset,
      products: rawResults.map((i) => ({
        productName: i._id,
        productId: i.productId,
        category: i.category,
        sellingPrice: Math.round(i.sellingPrice),
        unitsSold: i.netUnits > 0 ? i.netUnits : i.grossUnits,
        netUnits: i.netUnits,
        grossUnits: i.grossUnits,
        returnedUnits: i.returnedUnits,
        cancelledUnits: i.cancelledUnits,
        totalRevenueINR: Math.round(i.netRevenue > 0 ? i.netRevenue : i.grossRevenue),
        netRevenueINR: Math.round(i.netRevenue),
        grossRevenueINR: Math.round(i.grossRevenue),
        orderCount: i.orderCount
      })),
      debug: {
        sellerId: String(sellerId),
        activeDatasetId: datasetId,
        matchedRecordsCount: matchedRecords,
        totalDatasetRecords: totalInDataset,
        filtersUsed: {
          sellerId: String(sellerId),
          datasetId,
          ...(minPrice !== undefined ? { minPrice } : {}),
          ...(maxPrice !== undefined ? { maxPrice } : {})
        },
        rawAggregationResults: rawResults
      }
    };
  },

  /**
   * 4. Product Rankings: Top products by volume or revenue
   */
  async getProductRankings(sellerId, datasetId, { sortBy = 'unitsSold', limit = 10, category = null }) {
    const match = { sellerId: new mongoose.Types.ObjectId(sellerId) };
    if (datasetId) match.datasetId = datasetId;
    if (category && category !== 'All') match.category = category;

    const sortStage = sortBy === 'revenue' ? { totalRevenue: -1 } : { unitsSold: -1 };

    const items = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$productName',
          productId: { $first: '$productId' },
          category: { $first: '$category' },
          unitsSold: { $sum: '$quantity' },
          totalRevenue: { $sum: { $multiply: ['$quantity', '$sellingPrice'] } },
          avgSellingPrice: { $avg: '$sellingPrice' },
          returnsCount: {
            $sum: { $cond: [{ $in: [{ $toLower: '$returnStatus' }, ['returned', 'yes', 'true']] }, 1, 0] }
          },
          ordersCount: { $sum: 1 }
        }
      },
      { $sort: sortStage },
      { $limit: limit }
    ]);

    return {
      count: items.length,
      sortBy,
      products: items.map((i) => ({
        productName: i._id,
        productId: i.productId,
        category: i.category,
        unitsSold: i.unitsSold,
        totalRevenueINR: Math.round(i.totalRevenue),
        avgSellingPrice: Math.round(i.avgSellingPrice),
        returnRatePct: i.ordersCount > 0 ? Math.round((i.returnsCount / i.ordersCount) * 1000) / 10 : 0
      }))
    };
  },

  /**
   * 5. Inventory & Restock Alerts
   */
  async getInventoryAlerts(sellerId, datasetId) {
    const match = { sellerId: new mongoose.Types.ObjectId(sellerId) };
    if (datasetId) match.datasetId = datasetId;

    const alerts = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$productName',
          productId: { $first: '$productId' },
          category: { $first: '$category' },
          totalUnitsSold: { $sum: '$quantity' },
          currentStock: { $last: '$inventoryQuantity' },
          unitCost: { $avg: '$costPrice' },
          unitPrice: { $avg: '$sellingPrice' }
        }
      },
      { $sort: { currentStock: 1 } },
      { $limit: 8 }
    ]);

    return alerts.map((a) => ({
      productName: a._id,
      productId: a.productId,
      category: a.category,
      currentStock: a.currentStock || 0,
      totalUnitsSold: a.totalUnitsSold,
      urgency: (a.currentStock || 0) <= 25 ? 'CRITICAL_RESTOCK_URGENT' : (a.currentStock || 0) <= 50 ? 'REORDER_POINT_REACHED' : 'HEALTHY'
    }));
  },

  /**
   * 6. Dead Stock Risk Audit
   */
  async getDeadStockRisk(sellerId, datasetId) {
    const match = { sellerId: new mongoose.Types.ObjectId(sellerId) };
    if (datasetId) match.datasetId = datasetId;

    const records = await Sale.find(match)
      .select('productName category orderDate quantity inventoryQuantity costPrice')
      .lean();

    if (records.length === 0) return [];
    const dates = records.map((r) => new Date(r.orderDate).getTime());
    const maxDate = new Date(Math.max(...dates));

    const map = {};
    for (const r of records) {
      if (!map[r.productName]) {
        map[r.productName] = {
          lastSold: new Date(r.orderDate),
          stock: r.inventoryQuantity || 50,
          cost: r.costPrice || 0
        };
      }
      const d = new Date(r.orderDate);
      if (d > map[r.productName].lastSold) map[r.productName].lastSold = d;
    }

    const deadList = [];
    for (const [name, val] of Object.entries(map)) {
      const daysInactive = Math.round((maxDate - val.lastSold) / (1000 * 60 * 60 * 24));
      if (daysInactive >= 14) {
        deadList.push({
          productName: name,
          currentStock: val.stock,
          daysInactive,
          capitalAtRiskINR: Math.round(val.stock * val.cost),
          recommendedAction: 'Apply 15-25% clearance discount or pair in bundle with fast-moving complementary item.'
        });
      }
    }
    return deadList.sort((a, b) => b.capitalAtRiskINR - a.capitalAtRiskINR).slice(0, 6);
  },

  /**
   * 7. Cross-sell Apriori Bundles
   */
  async getTopBundles(sellerId, datasetId) {
    const match = { sellerId: new mongoose.Types.ObjectId(sellerId) };
    if (datasetId) match.datasetId = datasetId;

    const sales = await Sale.find(match).select('orderId productName').lean();
    const baskets = {};
    for (const s of sales) {
      if (!baskets[s.orderId]) baskets[s.orderId] = new Set();
      baskets[s.orderId].add(s.productName);
    }

    const pairs = {};
    for (const items of Object.values(baskets)) {
      const arr = Array.from(items);
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const key = `${arr[i]} + ${arr[j]}`;
          pairs[key] = (pairs[key] || 0) + 1;
        }
      }
    }

    return Object.entries(pairs)
      .map(([bundle, count]) => ({ bundle, coPurchasedFrequency: count }))
      .sort((a, b) => b.coPurchasedFrequency - a.coPurchasedFrequency)
      .slice(0, 5);
  },

  /**
   * 8. Demand Forecasting ML Bridge
   */
  async getMlDemandForecast(sellerId, datasetId, horizonDays = 30) {
    try {
      const salesData = await getSellerSalesData(sellerId, datasetId);
      if (!salesData || salesData.length === 0) return null;
      const forecast = await dispatchMlRequest('forecast', {
        sales_data: salesData,
        horizon_days: horizonDays
      });
      return forecast;
    } catch (err) {
      console.warn(`[ML Forecast Warning]: ${err.message}`);
      return null;
    }
  },

  /**
   * 9. Regional Opportunity Scoring ML Bridge
   */
  async getMlOpportunityScores(sellerId, datasetId) {
    try {
      const salesData = await getSellerSalesData(sellerId, datasetId);
      if (!salesData || salesData.length === 0) return null;
      const scored = await dispatchMlRequest('opportunity', {
        sales_data: salesData,
        group_by: 'state'
      });
      return scored?.results ? scored.results.slice(0, 5) : null;
    } catch (err) {
      console.warn(`[ML Opportunity Warning]: ${err.message}`);
      return null;
    }
  }
};

/**
 * Parses user natural language prompt to identify intent, price constraints, locations, and rankings
 */
async function parseUserIntent(sellerId, datasetId, userPrompt) {
  const lower = (userPrompt || '').toLowerCase();

  // 1. Check for Price-based Queries (e.g. "pricing more than 1400", "price > 1400", "above 1400", "costing over 1400")
  const priceMoreRegex = /(?:pric(?:e|ing)|cost|mrp|rate|priced)?\s*(?:more than|greater than|above|over|exceeding|>)\s*₹?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i;
  const priceLessRegex = /(?:pric(?:e|ing)|cost|mrp|rate|priced)?\s*(?:less than|under|below|<)\s*₹?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i;
  const priceBetweenRegex = /(?:pric(?:e|ing)|cost|mrp|rate|priced)?\s*(?:between)\s*₹?\s*(\d+)\s*(?:and|to|-)\s*₹?\s*(\d+)/i;

  const matchBetween = lower.match(priceBetweenRegex);
  if (matchBetween) {
    const min = parseFloat(matchBetween[1].replace(/,/g, ''));
    const max = parseFloat(matchBetween[2].replace(/,/g, ''));
    return {
      type: 'price_filter',
      minPrice: min,
      maxPrice: max
    };
  }

  const matchMore = lower.match(priceMoreRegex);
  if (matchMore && !lower.includes('less than') && !lower.includes('under')) {
    const min = parseFloat(matchMore[1].replace(/,/g, ''));
    return {
      type: 'price_filter',
      minPrice: min,
      maxPrice: null
    };
  }

  const matchLess = lower.match(priceLessRegex);
  if (matchLess) {
    const max = parseFloat(matchLess[1].replace(/,/g, ''));
    return {
      type: 'price_filter',
      minPrice: null,
      maxPrice: max
    };
  }

  // 2. Check for Regional Demand / City / State Queries
  // Extract all distinct cities and states currently present in active dataset
  const activeDatasetMatch = { sellerId: new mongoose.Types.ObjectId(sellerId) };
  if (datasetId) activeDatasetMatch.datasetId = datasetId;

  const activeCities = await Sale.distinct('city', activeDatasetMatch);
  const activeStates = await Sale.distinct('state', activeDatasetMatch);

  // Common Indian cities & states dictionary to detect location even if missing from dataset
  const indianLocations = [
    'kolkata', 'siliguri', 'asansol', 'gaya', 'muzaffarpur', 'jamshedpur', 'bokaro',
    'indore', 'bhopal', 'surat', 'ahmedabad', 'kochi', 'thiruvananthapuram', 'nagpur',
    'nashik', 'noida', 'kanpur', 'mysuru', 'mysore', 'visakhapatnam', 'vizag',
    'mumbai', 'pune', 'bengaluru', 'bangalore', 'delhi', 'chennai', 'hyderabad',
    'jaipur', 'lucknow', 'patna', 'kerala', 'maharashtra', 'karnataka', 'tamil nadu',
    'west bengal', 'gujarat', 'bihar', 'assam', 'punjab', 'rajasthan', 'uttar pradesh',
    'haryana', 'odisha', 'jharkhand', 'madhya pradesh', 'andhra pradesh'
  ];

  // Check all known locations first
  let detectedLocation = null;
  for (const loc of indianLocations) {
    const regex = new RegExp(`\\b${loc}\\b`, 'i');
    if (regex.test(lower)) {
      detectedLocation = loc;
      break;
    }
  }

  // Also check if any active city/state matches
  if (!detectedLocation) {
    for (const c of activeCities) {
      if (c && c.length > 2 && lower.includes(c.toLowerCase())) {
        detectedLocation = c;
        break;
      }
    }
  }
  if (!detectedLocation) {
    for (const s of activeStates) {
      if (s && s.length > 2 && lower.includes(s.toLowerCase())) {
        detectedLocation = s;
        break;
      }
    }
  }

  if (detectedLocation) {
    return {
      type: 'regional_demand',
      location: detectedLocation
    };
  }

  // 3. Check for ML Forecasting Queries
  if (lower.includes('forecast') || lower.includes('predict') || lower.includes('future') || lower.includes('next month') || lower.includes('next 30 days') || lower.includes('growth')) {
    return { type: 'forecast' };
  }

  // 4. Check for Regional Opportunities
  if (lower.includes('opportunity') || lower.includes('untapped') || lower.includes('expansion') || lower.includes('expand')) {
    return { type: 'opportunity' };
  }

  // 5. Check for Inventory & Restock
  if (lower.includes('restock') || lower.includes('inventory') || lower.includes('stockout') || lower.includes('safety stock') || lower.includes('reorder')) {
    return { type: 'inventory' };
  }

  // 6. Check for Dead Stock
  if (lower.includes('dead stock') || lower.includes('slow moving') || lower.includes('unsold') || lower.includes('stagnant')) {
    return { type: 'dead_stock' };
  }

  // 7. Check for Cross-Sell Bundles
  if (lower.includes('bundle') || lower.includes('together') || lower.includes('cross-sell') || lower.includes('pair')) {
    return { type: 'bundles' };
  }

  // 8. Check for Product Rankings (e.g. "top products", "most famous", "best selling")
  if (lower.includes('most famous') || lower.includes('top product') || lower.includes('best selling') || lower.includes('highest selling') || lower.includes('leaderboard')) {
    return { type: 'product_ranking' };
  }

  // Default: General Overview
  return { type: 'overview' };
}

/**
 * Dispatches request to Groq Cloud (gsk_...) or xAI Grok (xai-...) API
 */
async function callGrokAPI(apiKey, systemInstruction, userPrompt, contextData) {
  const isGroq = apiKey.trim().startsWith('gsk_');
  const endpoint = isGroq
    ? 'https://api.groq.com/openai/v1/chat/completions'
    : 'https://api.x.ai/v1/chat/completions';

  const defaultModel = isGroq ? 'openai/gpt-oss-120b' : 'grok-2-latest';
  const model = (process.env.GROK_MODEL && process.env.GROK_MODEL !== 'grok-2-latest')
    ? process.env.GROK_MODEL
    : defaultModel;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 14000);

  const payload = {
    model,
    messages: [
      {
        role: 'system',
        content: systemInstruction
      },
      {
        role: 'user',
        content: `VERIFIED ACTIVE DATASET FACTS (MONGODB TRANSACTIONS):\n${JSON.stringify(contextData, null, 2)}\n\nMERCHANT QUESTION: "${userPrompt}"\n\nGenerate a structured, professional, and accurate response:`
      }
    ],
    temperature: 0.1,
    max_tokens: 800
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    return content ? content.trim() : null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Handles merchant queries with Grok (xAI) or Google Gen AI (gemini-3.8-flash)
 * strictly grounded in active dataset facts and MongoDB aggregations.
 */
async function generateCopilotResponse(sellerId, userPrompt, explicitDatasetId = null) {
  // 1. Resolve active dataset ID for this seller
  const activeDatasetId = explicitDatasetId || await resolveActiveDatasetId(sellerId);

  // Check if seller has any data in this active dataset
  const matchFilter = { sellerId: new mongoose.Types.ObjectId(sellerId) };
  if (activeDatasetId) matchFilter.datasetId = activeDatasetId;

  const totalSales = await Sale.countDocuments(matchFilter);
  if (totalSales === 0) {
    return {
      reply: "You currently haven't uploaded any sales data to your account. To generate data-driven business intelligence, please navigate to the **Upload Data** section to upload a CSV/Excel sales report or click **'Load Demo Data'** in Settings to test immediately with 1,500+ verified Indian transactions.",
      hasData: false,
      contextType: 'no_data',
      groundedData: null,
      activeDatasetId: null
    };
  }

  // Fetch active upload log metadata for clear citation
  const activeLog = await UploadLog.findOne({ sellerId: new mongoose.Types.ObjectId(sellerId), isActive: true, status: { $ne: 'failed' } })
    .sort({ createdAt: -1 })
    .lean();
  const datasetName = activeLog ? activeLog.filename : activeDatasetId;

  // 2. Parse User Intent and Execute Grounding Tool
  const intent = await parseUserIntent(sellerId, activeDatasetId, userPrompt);
  let contextData = {};
  let contextType = intent.type;
  let fallbackReply = '';

  if (intent.type === 'price_filter') {
    const priceRes = await AnalyticsGrounding.getPriceFilteredProducts(sellerId, activeDatasetId, {
      minPrice: intent.minPrice,
      maxPrice: intent.maxPrice,
      sortBy: 'unitsSold',
      limit: 10
    });
    contextData = {
      activeDatasetId,
      datasetName,
      priceCriteria: intent,
      filteredProducts: priceRes,
      debug: priceRes.debug
    };

    if (priceRes.found) {
      const priceDesc = intent.minPrice && intent.maxPrice
        ? `priced between ₹${intent.minPrice.toLocaleString('en-IN')} and ₹${intent.maxPrice.toLocaleString('en-IN')}`
        : intent.minPrice
        ? `priced more than ₹${intent.minPrice.toLocaleString('en-IN')}`
        : `priced under ₹${intent.maxPrice.toLocaleString('en-IN')}`;

      fallbackReply = `Here are the top-selling products in your active dataset (${datasetName}) ${priceDesc}, ranked by popularity (units sold):\n\n`;
      fallbackReply += `**Top Products (${priceDesc}):**\n`;
      priceRes.products.forEach((p, i) => {
        fallbackReply += `${i + 1}. **${p.productName}** [${p.category}] — **${p.unitsSold} units sold** | MRP: ₹${p.sellingPrice.toLocaleString('en-IN')} (Revenue: ₹${p.totalRevenueINR.toLocaleString('en-IN')})\n`;
      });
      fallbackReply += `\n*Catalog Insight:* ${priceRes.products[0].productName} is currently your most famous product in this price bracket.`;
    } else {
      const priceDesc = intent.minPrice ? `more than ₹${intent.minPrice.toLocaleString('en-IN')}` : `matching criteria`;
      fallbackReply = `No products with pricing ${priceDesc} were found in your active sales dataset (${datasetName}).\n\nPlease check your catalog pricing or try a different price filter.`;
    }

  } else if (intent.type === 'regional_demand') {
    const locRes = await AnalyticsGrounding.getTopProductsByLocation(sellerId, activeDatasetId, intent.location, 6);
    contextData = {
      activeDatasetId,
      datasetName,
      queriedLocation: intent.location,
      regionalResult: locRes,
      debug: locRes.debug
    };

    if (locRes.found) {
      const topP = locRes.products[0];
      fallbackReply = `In **${intent.location.toUpperCase()}**, consumer demand in your active dataset (\`${datasetName}\`) is led by **${topP.productName}** with **${topP.unitsSold} units** (₹${topP.totalRevenueINR.toLocaleString('en-IN')}).\n\n`;
      fallbackReply += `**Top Regional Rankings in ${intent.location.toUpperCase()}:**\n`;
      locRes.products.forEach((p, i) => {
        let statsStr = `**${p.unitsSold} units** | ₹${p.totalRevenueINR.toLocaleString('en-IN')}`;
        if (p.returnedUnits > 0 || p.cancelledUnits > 0) {
          statsStr += ` *(Net Fulfilled; Gross: ${p.grossUnits} ordered | ${p.returnedUnits} ret, ${p.cancelledUnits} canc)*`;
        } else {
          statsStr += ` *(${p.orderCount} orders)*`;
        }
        fallbackReply += `${i + 1}. **${p.productName}** (${p.category}) — ${statsStr}\n`;
      });
      fallbackReply += `\n*Database Verification:* Aggregated **${locRes.matchedRecordsCount} matching records** out of **${locRes.totalDatasetRecords} total records** strictly for dataset \`${activeDatasetId}\`.`;
    } else {
      fallbackReply = `No sales data is available for **${intent.location.toUpperCase()}** in your active sales dataset (\`${datasetName}\`).\n\n`;
      if (locRes.availableCities && locRes.availableCities.length > 0) {
        fallbackReply += `Your active dataset includes delivered sales across these regional hubs:\n`;
        fallbackReply += `${locRes.availableCities.map((c) => `• **${c}**`).join(', ')}`;
        fallbackReply += `\n\nTo view analytics for ${intent.location}, please upload a sales report containing orders from that region.`;
      }
    }

  } else if (intent.type === 'product_ranking') {
    const rankRes = await AnalyticsGrounding.getProductRankings(sellerId, activeDatasetId, { sortBy: 'unitsSold', limit: 8 });
    contextData = {
      activeDatasetId,
      datasetName,
      catalogRankings: rankRes,
      debug: {
        sellerId: String(sellerId),
        activeDatasetId,
        datasetName,
        queryIntent: 'product_ranking',
        returnedCount: rankRes.count,
        rawAggregationResults: rankRes.products
      }
    };
    fallbackReply = `Here are the top-performing products in your active dataset (\`${datasetName}\`) ranked by units sold:\n\n`;
    rankRes.products.forEach((p, i) => {
      fallbackReply += `${i + 1}. **${p.productName}** [${p.category}] — **${p.unitsSold} units sold** | ₹${p.totalRevenueINR.toLocaleString('en-IN')} (Avg Price: ₹${p.avgSellingPrice.toLocaleString('en-IN')})\n`;
    });

  } else if (intent.type === 'inventory') {
    const alerts = await AnalyticsGrounding.getInventoryAlerts(sellerId, activeDatasetId);
    contextData = {
      activeDatasetId,
      datasetName,
      urgentRestockAlerts: alerts,
      debug: {
        sellerId: String(sellerId),
        activeDatasetId,
        datasetName,
        queryIntent: 'inventory',
        alertsCount: alerts.length,
        rawAggregationResults: alerts
      }
    };
    fallbackReply = `**Critical Restock Recommendations for Active Dataset (\`${datasetName}\`):**\n\n`;
    alerts.forEach((a, i) => {
      fallbackReply += `${i + 1}. **${a.productName}** — Stock: **${a.currentStock} units** (Total Sold: ${a.totalUnitsSold}) | Status: **${a.urgency}**\n`;
    });
    fallbackReply += `\n*Recommendation:* Place replenishment purchase orders for low-stock items to prevent stockouts.`;

  } else if (intent.type === 'dead_stock') {
    const dead = await AnalyticsGrounding.getDeadStockRisk(sellerId, activeDatasetId);
    contextData = {
      activeDatasetId,
      datasetName,
      deadStockRiskAssessment: dead,
      debug: {
        sellerId: String(sellerId),
        activeDatasetId,
        datasetName,
        queryIntent: 'dead_stock',
        deadStockCount: dead.length,
        rawAggregationResults: dead
      }
    };
    if (dead.length > 0) {
      fallbackReply = `**Dead Stock Risk Audit (\`${datasetName}\`):**\n\n`;
      dead.forEach((d, i) => {
        fallbackReply += `${i + 1}. **${d.productName}** — ${d.daysInactive} days inactive | Capital at Risk: **₹${d.capitalAtRiskINR.toLocaleString('en-IN')}**\n   └ *Mitigation:* ${d.recommendedAction}\n`;
      });
    } else {
      fallbackReply = `Great news! No dead stock or severe inventory stagnation was detected in your active dataset (\`${datasetName}\`). All SKUs have logged recent sales.`;
    }

  } else if (intent.type === 'bundles') {
    const bundles = await AnalyticsGrounding.getTopBundles(sellerId, activeDatasetId);
    contextData = {
      activeDatasetId,
      datasetName,
      frequentlyPurchasedBundles: bundles,
      debug: {
        sellerId: String(sellerId),
        activeDatasetId,
        datasetName,
        queryIntent: 'bundles',
        bundlesCount: bundles.length,
        rawAggregationResults: bundles
      }
    };
    if (bundles.length > 0) {
      fallbackReply = `**Top Co-Purchased Bundles (\`${datasetName}\`):**\n\n`;
      bundles.forEach((b, i) => {
        fallbackReply += `${i + 1}. **${b.bundle}** (Ordered together ${b.coPurchasedFrequency} times)\n`;
      });
      fallbackReply += `\n*Strategy:* Offer a 5-10% discount on these bundles to lift Average Order Value (AOV).`;
    } else {
      fallbackReply = `No cross-sell bundles with 2+ items per order were identified in active dataset (\`${datasetName}\`). Orders appear to be single-item purchases.`;
    }

  } else {
    // General Store Overview
    const overview = await AnalyticsGrounding.getOverview(sellerId, activeDatasetId);
    const topProds = await AnalyticsGrounding.getProductRankings(sellerId, activeDatasetId, { limit: 5 });
    contextData = {
      activeDatasetId,
      datasetName,
      storeOverview: overview,
      topCatalogProducts: topProds.products,
      debug: overview?.debug
    };

    fallbackReply = `**Active Dataset Performance Summary (\`${datasetName}\`):**\n\n`;
    fallbackReply += `• Total Sales Revenue: **₹${overview?.totalRevenueINR?.toLocaleString('en-IN') || 0}**\n`;
    fallbackReply += `• Total Units Delivered: **${overview?.totalUnitsSold?.toLocaleString('en-IN') || 0} units** across ${overview?.totalOrdersCount || 0} verified orders\n`;
    fallbackReply += `• Geographic Reach: **${overview?.activeCitiesCovered || 0} Cities** across ${overview?.activeStatesCovered || 0} States\n`;
    fallbackReply += `• Gross Profit Margin: **${overview?.grossProfitMarginPct || 0}%** (Profit: ₹${overview?.grossProfitINR?.toLocaleString('en-IN') || 0})\n`;
    fallbackReply += `• Return Rate: **${overview?.returnRatePct || 0}%**\n\n`;
    if (topProds.products.length > 0) {
      fallbackReply += `**Top 3 Catalog Leaders:**\n`;
      topProds.products.slice(0, 3).forEach((p, i) => {
        fallbackReply += `${i + 1}. **${p.productName}** — ${p.unitsSold} units (₹${p.totalRevenueINR.toLocaleString('en-IN')})\n`;
      });
    }
  }

  const systemInstruction = `You are GeoCommerce AI Copilot, a senior Indian e-commerce strategist and supply chain analyst.
You are analyzing verified transaction data strictly for active dataset: "${datasetName}" (ID: ${activeDatasetId}).
STRICT BUSINESS RULES:
1. NEVER fabricate, hallucinate, or estimate numbers, products, prices, or locations.
2. Quote exact numbers strictly from the VERIFIED DATABASE FACTS provided below.
3. If the facts indicate that a location or price filter has NO records (found: false), explicitly state that no sales data is available for that location/criteria in the active dataset (${datasetName}), and list the actual cities/products available.
4. Always answer the merchant's exact question directly and concisely.`;

  // 3a. Attempt Groq Cloud (gsk_...) or Grok xAI (xai-...) if configured
  const grokApiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
  if (grokApiKey && !grokApiKey.includes('your_') && grokApiKey.trim().length > 15) {
    try {
      const grokReply = await callGrokAPI(grokApiKey, systemInstruction, userPrompt, contextData);
      if (grokReply && grokReply.trim().length > 10) {
        const isGroq = grokApiKey.trim().startsWith('gsk_');
        const defaultModel = isGroq ? 'openai/gpt-oss-120b' : 'grok-2-latest';
        const modelName = process.env.GROK_MODEL || defaultModel;
        const providerName = isGroq ? 'Groq Cloud LPU' : 'Grok (xAI)';

        return {
          reply: grokReply.trim(),
          message: grokReply.trim(),
          contextType,
          groundedData: contextData,
          debug: contextData?.debug || null,
          activeDatasetId,
          datasetName,
          hasData: true,
          engine: `${providerName} [${modelName}] with Active Dataset Grounding`
        };
      }
    } catch (grokError) {
      console.warn(`[AI Engine Notice] ${grokError.message}. Falling back to secondary provider.`);
    }
  }

  // 3b. Attempt Gemini Model Interpretation with Grounded Facts
  const ai = getGeminiClient();

  if (ai) {
    try {
      const prompt = `${systemInstruction}

VERIFIED ACTIVE DATASET FACTS (MONGODB TRANSACTIONS):
${JSON.stringify(contextData, null, 2)}

MERCHANT QUESTION: "${userPrompt}"

Generate a structured, professional, and accurate response:`;

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('GEMINI_TIMEOUT_10S')), 10000)
      );

      const response = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            temperature: 0.1,
            maxOutputTokens: 800
          }
        }),
        timeoutPromise
      ]);

      if (response && response.text && response.text.trim().length > 10) {
        return {
          reply: response.text.trim(),
          message: response.text.trim(),
          contextType,
          groundedData: contextData,
          debug: contextData?.debug || null,
          activeDatasetId,
          datasetName,
          hasData: true,
          engine: 'Gemini-3.8-Flash (Google Gen AI SDK) with Active Dataset Grounding'
        };
      }
    } catch (geminiError) {
      console.warn(`[Gemini SDK Notice] API issue (${geminiError.message}). Operating on verified deterministic engine.`);
    }
  }

  // 4. Guaranteed Deterministic Verified Engine (Zero hallucination, 100% active dataset fidelity)
  return {
    reply: fallbackReply,
    message: fallbackReply,
    contextType,
    groundedData: contextData,
    debug: contextData?.debug || null,
    activeDatasetId,
    datasetName,
    hasData: true,
    engine: 'GeoCommerce Verified Active Analytics Engine (MongoDB Aggregation Grounded)'
  };
}

module.exports = {
  AnalyticsGrounding,
  generateCopilotResponse
};
