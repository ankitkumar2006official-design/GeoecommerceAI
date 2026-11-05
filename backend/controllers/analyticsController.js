const Sale = require('../models/Sale');
const mongoose = require('mongoose');
const { resolveActiveDatasetId } = require('../services/datasetService');

// Helper to construct date/category/dataset filter query
async function buildFilterQuery(sellerId, filters = {}) {
  const query = { sellerId: new mongoose.Types.ObjectId(sellerId) };

  // Strict dataset isolation: query active dataset unless specific dataset requested
  const datasetId = filters.datasetId || await resolveActiveDatasetId(sellerId);
  if (datasetId) {
    query.datasetId = datasetId;
  }

  if (filters.category && filters.category !== 'All') {
    query.category = filters.category;
  }
  if (filters.state && filters.state !== 'All') {
    query.state = filters.state;
  }
  if (filters.city && filters.city !== 'All') {
    query.city = filters.city;
  }
  if (filters.startDate || filters.endDate) {
    query.orderDate = {};
    if (filters.startDate) query.orderDate.$gte = new Date(filters.startDate);
    if (filters.endDate) query.orderDate.$lte = new Date(filters.endDate);
  }

  return query;
}

exports.getOverview = async (req, res) => {
  try {
    const sellerId = req.sellerId;
    const query = await buildFilterQuery(sellerId, req.query);

    const [summary] = await Sale.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: { $multiply: ['$quantity', '$sellingPrice'] } },
          totalUnits: { $sum: '$quantity' },
          totalOrders: { $addToSet: '$orderId' },
          totalCost: { $sum: { $multiply: ['$quantity', '$costPrice'] } },
          totalAdSpend: { $sum: '$adSpend' },
          distinctProducts: { $addToSet: '$productId' },
          distinctStates: { $addToSet: '$state' },
          distinctPincodes: { $addToSet: '$pincode' },
          returnsCount: {
            $sum: {
              $cond: [
                {
                  $in: [
                    { $toLower: '$returnStatus' },
                    ['returned', 'yes', 'true']
                  ]
                },
                1,
                0
              ]
            }
          },
          cancellationsCount: {
            $sum: {
              $cond: [
                {
                  $in: [
                    { $toLower: '$cancellationStatus' },
                    ['cancelled', 'yes', 'true']
                  ]
                },
                1,
                0
              ]
            }
          },
          totalRecords: { $sum: 1 }
        }
      }
    ]);

    if (!summary) {
      return res.json({
        totalRevenue: 0,
        totalUnits: 0,
        totalOrdersCount: 0,
        grossProfit: 0,
        profitMarginPct: 0,
        distinctProductsCount: 0,
        distinctStatesCount: 0,
        distinctPincodesCount: 0,
        returnRatePct: 0,
        cancellationRatePct: 0,
        hasData: false
      });
    }

    const totalOrdersCount = summary.totalOrders.length;
    const grossProfit = summary.totalRevenue - summary.totalCost;
    const profitMarginPct = summary.totalRevenue > 0 ? (grossProfit / summary.totalRevenue) * 100 : 0;
    const returnRatePct = summary.totalRecords > 0 ? (summary.returnsCount / summary.totalRecords) * 100 : 0;
    const cancellationRatePct = summary.totalRecords > 0 ? (summary.cancellationsCount / summary.totalRecords) * 100 : 0;

    // Monthly revenue trend (last 12 months)
    const monthlyTrend = await Sale.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            year: { $year: '$orderDate' },
            month: { $month: '$orderDate' }
          },
          revenue: { $sum: { $multiply: ['$quantity', '$sellingPrice'] } },
          units: { $sum: '$quantity' },
          orders: { $addToSet: '$orderId' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          _id: 0,
          period: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              {
                $cond: [
                  { $lt: ['$_id.month', 10] },
                  { $concat: ['0', { $toString: '$_id.month' }] },
                  { $toString: '$_id.month' }
                ]
              }
            ]
          },
          revenue: { $round: ['$revenue', 2] },
          units: '$units',
          orderCount: { $size: '$orders' }
        }
      }
    ]);

    // Category distribution
    const categoryDistribution = await Sale.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$category',
          units: { $sum: '$quantity' },
          revenue: { $sum: { $multiply: ['$quantity', '$sellingPrice'] } }
        }
      },
      { $sort: { revenue: -1 } },
      {
        $project: {
          _id: 0,
          category: '$_id',
          units: 1,
          revenue: { $round: ['$revenue', 2] }
        }
      }
    ]);

    // Top 5 regions by revenue
    const topRegions = await Sale.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$state',
          units: { $sum: '$quantity' },
          revenue: { $sum: { $multiply: ['$quantity', '$sellingPrice'] } }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 6 },
      {
        $project: {
          _id: 0,
          state: '$_id',
          units: 1,
          revenue: { $round: ['$revenue', 2] }
        }
      }
    ]);

    res.json({
      totalRevenue: Math.round(summary.totalRevenue),
      totalUnits: summary.totalUnits,
      totalOrdersCount,
      grossProfit: Math.round(grossProfit),
      profitMarginPct: Math.round(profitMarginPct * 10) / 10,
      totalAdSpend: Math.round(summary.totalAdSpend),
      distinctProductsCount: summary.distinctProducts.length,
      distinctStatesCount: summary.distinctStates.length,
      distinctPincodesCount: summary.distinctPincodes.length,
      returnRatePct: Math.round(returnRatePct * 10) / 10,
      cancellationRatePct: Math.round(cancellationRatePct * 10) / 10,
      monthlyTrend,
      categoryDistribution,
      topRegions,
      hasData: true
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRegionalDemand = async (req, res) => {
  try {
    const sellerId = req.sellerId;
    const { level = 'state' } = req.query; // 'state', 'district', 'city', 'pincode'
    const query = await buildFilterQuery(sellerId, req.query);

    const groupField = `$${level}`;

    const regionalStats = await Sale.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            location: groupField,
            productName: '$productName',
            productId: '$productId',
            category: '$category'
          },
          units: { $sum: '$quantity' },
          revenue: { $sum: { $multiply: ['$quantity', '$sellingPrice'] } }
        }
      },
      { $sort: { '_id.location': 1, units: -1 } },
      {
        $group: {
          _id: '$_id.location',
          totalUnits: { $sum: '$units' },
          totalRevenue: { $sum: '$revenue' },
          topProduct: { $first: '$_id.productName' },
          topProductId: { $first: '$_id.productId' },
          topProductUnits: { $first: '$units' },
          topProductRevenue: { $first: '$revenue' },
          categories: { $addToSet: '$_id.category' }
        }
      },
      { $sort: { totalUnits: -1 } },
      {
        $project: {
          _id: 0,
          location: '$_id',
          totalUnits: 1,
          totalRevenue: { $round: ['$totalRevenue', 2] },
          topProduct: 1,
          topProductId: 1,
          topProductUnits: 1,
          topProductRevenue: { $round: ['$topProductRevenue', 2] },
          categoryCount: { $size: '$categories' }
        }
      }
    ]);

    res.json({
      level,
      regions: regionalStats,
      count: regionalStats.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProductAnalytics = async (req, res) => {
  try {
    const sellerId = req.sellerId;
    const query = await buildFilterQuery(sellerId, req.query);

    const products = await Sale.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            productId: '$productId',
            productName: '$productName',
            category: '$category'
          },
          unitsSold: { $sum: '$quantity' },
          revenue: { $sum: { $multiply: ['$quantity', '$sellingPrice'] } },
          cost: { $sum: { $multiply: ['$quantity', '$costPrice'] } },
          avgSellingPrice: { $avg: '$sellingPrice' },
          ordersCount: { $sum: 1 },
          currentInventory: { $last: '$inventoryQuantity' },
          statesCovered: { $addToSet: '$state' },
          returnsCount: {
            $sum: {
              $cond: [
                {
                  $in: [
                    { $toLower: '$returnStatus' },
                    ['returned', 'yes', 'true']
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          productId: '$_id.productId',
          productName: '$_id.productName',
          category: '$_id.category',
          unitsSold: 1,
          revenue: { $round: ['$revenue', 2] },
          grossProfit: { $round: [{ $subtract: ['$revenue', '$cost'] }, 2] },
          profitMarginPct: {
            $cond: [
              { $gt: ['$revenue', 0] },
              { $round: [{ $multiply: [{ $divide: [{ $subtract: ['$revenue', '$cost'] }, '$revenue'] }, 100] }, 1] },
              0
            ]
          },
          avgSellingPrice: { $round: ['$avgSellingPrice', 2] },
          ordersCount: 1,
          currentInventory: 1,
          geographicSpread: { $size: '$statesCovered' },
          returnRatePct: {
            $cond: [
              { $gt: ['$ordersCount', 0] },
              { $round: [{ $multiply: [{ $divide: ['$returnsCount', '$ordersCount'] }, 100] }, 1] },
              0
            ]
          }
        }
      },
      {
        $sort: req.query.sortBy === 'revenue' ? { revenue: -1 } : { unitsSold: -1 }
      }
    ]);

    res.json({ products, count: products.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMapData = async (req, res) => {
  try {
    const sellerId = req.sellerId;
    const query = await buildFilterQuery(sellerId, req.query);

    // Group by PIN code cluster to supply Leaflet map markers
    const mapPoints = await Sale.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            pincode: '$pincode',
            city: '$city',
            state: '$state',
            lat: '$lat',
            lng: '$lng'
          },
          units: { $sum: '$quantity' },
          revenue: { $sum: { $multiply: ['$quantity', '$sellingPrice'] } },
          orderCount: { $sum: 1 },
          products: {
            $push: {
              name: '$productName',
              qty: '$quantity'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          pincode: '$_id.pincode',
          city: '$_id.city',
          state: '$_id.state',
          lat: '$_id.lat',
          lng: '$_id.lng',
          units: 1,
          revenue: { $round: ['$revenue', 2] },
          orderCount: 1,
          products: 1
        }
      }
    ]);

    // Determine top product per pincode
    const formattedPoints = mapPoints.map((pt) => {
      const prodMap = {};
      pt.products.forEach((p) => {
        prodMap[p.name] = (prodMap[p.name] || 0) + p.qty;
      });
      let topProd = 'N/A';
      let maxQ = 0;
      for (const [name, q] of Object.entries(prodMap)) {
        if (q > maxQ) {
          maxQ = q;
          topProd = name;
        }
      }
      return {
        pincode: pt.pincode,
        city: pt.city,
        state: pt.state,
        lat: pt.lat || 20.5937,
        lng: pt.lng || 78.9629,
        units: pt.units,
        revenue: pt.revenue,
        orderCount: pt.orderCount,
        topProduct: topProd,
        topProductQty: maxQ
      };
    });

    res.json({ points: formattedPoints, count: formattedPoints.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

