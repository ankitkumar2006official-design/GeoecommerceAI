const Sale = require('../models/Sale');
const Scenario = require('../models/Scenario');
const mongoose = require('mongoose');
const { resolveActiveDatasetId } = require('../services/datasetService');

exports.simulateScenario = async (req, res) => {
  try {
    const {
      priceChangePct = 0,
      inventoryChangePct = 0,
      adSpendChangePct = 0,
      targetRegion = 'All',
      targetCategory = 'All',
      datasetId: reqDatasetId
    } = req.body;

    const sellerId = req.sellerId;
    const datasetId = reqDatasetId || await resolveActiveDatasetId(sellerId);

    const matchQuery = { sellerId: new mongoose.Types.ObjectId(sellerId) };
    if (datasetId) matchQuery.datasetId = datasetId;
    if (targetRegion !== 'All') matchQuery.state = targetRegion;
    if (targetCategory !== 'All') matchQuery.category = targetCategory;

    const sales = await Sale.find(matchQuery).lean();
    if (sales.length === 0) {
      return res.status(400).json({ error: 'No matching sales records found to simulate.' });
    }

    let baseUnits = 0;
    let baseRevenue = 0;
    let baseCost = 0;
    let baseAdSpend = 0;

    for (const s of sales) {
      baseUnits += s.quantity;
      baseRevenue += s.quantity * s.sellingPrice;
      baseCost += s.quantity * s.costPrice;
      baseAdSpend += s.adSpend || 0;
    }

    const baseProfit = baseRevenue - baseCost - baseAdSpend;

    // Price elasticity assumption: standard -1.25 for retail
    const elasticity = -1.25;
    const priceMultiplier = 1 + priceChangePct / 100;
    const volumeChangePct = elasticity * priceChangePct;
    const volumeMultiplier = Math.max(0.1, 1 + volumeChangePct / 100);

    // Ad spend lift assumption: ~0.45 elasticity of sales with respect to ad spend
    const adSpendMultiplier = 1 + adSpendChangePct / 100;
    const adLiftPct = (adSpendChangePct > 0 ? adSpendChangePct * 0.4 : adSpendChangePct * 0.7);
    const adLiftMultiplier = Math.max(0.2, 1 + adLiftPct / 100);

    // Combined volume estimate
    const simUnits = Math.round(baseUnits * volumeMultiplier * adLiftMultiplier);
    const avgPrice = (baseRevenue / baseUnits) * priceMultiplier;
    const avgCost = baseCost / baseUnits;

    const simRevenue = Math.round(simUnits * avgPrice);
    const simCogs = Math.round(simUnits * avgCost);
    const simAdSpend = Math.round(baseAdSpend * adSpendMultiplier);
    const simProfit = Math.round(simRevenue - simCogs - simAdSpend);

    // Additional inventory requirements
    const currentInventory = sales.reduce((acc, s) => acc + (s.inventoryQuantity || 50), 0);
    const stockAdjustment = Math.round(currentInventory * (inventoryChangePct / 100));
    const newStockAvailable = currentInventory + stockAdjustment;

    const revenueDelta = simRevenue - baseRevenue;
    const profitDelta = simProfit - baseProfit;
    const revenueChangePctActual = baseRevenue > 0 ? Math.round((revenueDelta / baseRevenue) * 1000) / 10 : 0;
    const profitChangePctActual = baseProfit > 0 ? Math.round((profitDelta / baseProfit) * 1000) / 10 : 0;

    res.json({
      parameters: {
        priceChangePct,
        inventoryChangePct,
        adSpendChangePct,
        targetRegion,
        targetCategory
      },
      baseline: {
        units: baseUnits,
        revenue: Math.round(baseRevenue),
        profit: Math.round(baseProfit),
        adSpend: Math.round(baseAdSpend),
        inventory: currentInventory
      },
      simulated: {
        projectedUnits: simUnits,
        projectedRevenue: simRevenue,
        projectedProfit: simProfit,
        projectedAdSpend: simAdSpend,
        projectedInventory: newStockAvailable,
        revenueChangePct: revenueChangePctActual,
        profitChangePct: profitChangePctActual,
        revenueDelta: Math.round(revenueDelta),
        profitDelta: Math.round(profitDelta),
        stockoutRisk: simUnits > newStockAvailable ? 'Elevated (Projected demand exceeds simulated stock)' : 'Low'
      },
      disclaimer: 'Simulated estimates are calculated using microeconomic price elasticity models (-1.25) and historical sales parameters. Actual marketplace response may vary.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.saveScenario = async (req, res) => {
  try {
    const { name, description, parameters, projectedMetrics } = req.body;
    const scenario = new Scenario({
      sellerId: req.sellerId,
      name: name || 'Simulation Scenario',
      description: description || '',
      parameters,
      projectedMetrics
    });
    await scenario.save();
    res.status(201).json({ message: 'Scenario saved successfully', scenario });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSavedScenarios = async (req, res) => {
  try {
    const scenarios = await Scenario.find({ sellerId: req.sellerId }).sort({ createdAt: -1 });
    res.json({ scenarios });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

