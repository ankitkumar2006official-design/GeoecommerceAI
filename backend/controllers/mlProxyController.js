const axios = require('axios');
const path = require('path');
const { spawn } = require('child_process');
const Sale = require('../models/Sale');
const { resolveActiveDatasetId } = require('../services/datasetService');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';

// Helper to fetch seller sales data formatted for ML service strictly for active dataset
async function getSellerSalesData(sellerId, explicitDatasetId = null) {
  const query = { sellerId };
  const datasetId = explicitDatasetId || await resolveActiveDatasetId(sellerId);
  if (datasetId) {
    query.datasetId = datasetId;
  }

  const records = await Sale.find(query)
    .select('orderId productId productName category orderDate pincode city district state region quantity sellingPrice costPrice returnStatus cancellationStatus discount inventoryQuantity shippingCost adSpend lat lng -_id')
    .lean();

  return records.map((r) => ({
    'Order ID': r.orderId,
    'Product ID': r.productId,
    'Product Name': r.productName,
    'Product Category': r.category,
    'Order Date': r.orderDate ? r.orderDate.toISOString().split('T')[0] : '',
    'Delivery PIN Code': r.pincode,
    'State': r.state,
    'City': r.city,
    'District': r.district,
    'Quantity': r.quantity,
    'Selling Price': r.sellingPrice,
    'Cost Price': r.costPrice,
    'Return Status': r.returnStatus,
    'Cancellation Status': r.cancellationStatus,
    'Discount': r.discount,
    'Inventory Quantity': r.inventoryQuantity,
    'Shipping Cost': r.shippingCost,
    'Advertising Spend': r.adSpend
  }));
}

// Fallback executor via python bridge if HTTP service is not running
async function executePythonBridge(action, payload) {
  return new Promise((resolve, reject) => {
    const bridgePath = path.resolve(__dirname, '../../ml_service/bridge.py');
    const pyProc = spawn('python', [bridgePath, action], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdoutData = '';
    let stderrData = '';

    pyProc.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    pyProc.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    pyProc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Python bridge exited with code ${code}: ${stderrData}`));
      }
      try {
        const json = JSON.parse(stdoutData);
        resolve(json);
      } catch (err) {
        reject(new Error(`Failed to parse python bridge output: ${stdoutData}`));
      }
    });

    pyProc.on('error', (err) => {
      reject(err);
    });

    pyProc.stdin.write(JSON.stringify(payload));
    pyProc.stdin.end();
  });
}

const ACTION_TO_ENDPOINT = {
  forecast: 'forecast',
  opportunity: 'opportunity-score',
  'opportunity-score': 'opportunity-score',
  inventory: 'inventory-optimizer',
  'inventory-optimizer': 'inventory-optimizer',
  bundles: 'bundles',
  warehouse: 'warehouse-optimizer',
  'warehouse-optimizer': 'warehouse-optimizer',
  pricing: 'pricing',
  marketing: 'marketing'
};

const ACTION_TO_BRIDGE = {
  forecast: 'forecast',
  opportunity: 'opportunity',
  'opportunity-score': 'opportunity',
  inventory: 'inventory',
  'inventory-optimizer': 'inventory',
  bundles: 'bundles',
  warehouse: 'warehouse',
  'warehouse-optimizer': 'warehouse',
  pricing: 'pricing',
  marketing: 'marketing'
};

// Unified dispatcher: Try FastAPI HTTP first, fallback to Python bridge
async function dispatchMlRequest(endpointAction, payload) {
  const httpEndpoint = ACTION_TO_ENDPOINT[endpointAction] || endpointAction;
  const bridgeAction = ACTION_TO_BRIDGE[endpointAction] || endpointAction.replace('-optimizer', '').replace('-score', '');

  try {
    const response = await axios.post(`${ML_SERVICE_URL}/api/ml/${httpEndpoint}`, payload, {
      timeout: 15000
    });
    return response.data;
  } catch (err) {
    if (
      err.code === 'ECONNREFUSED' ||
      err.code === 'ETIMEDOUT' ||
      err.code === 'ECONNABORTED' ||
      err.code === 'ENOTFOUND' ||
      err.response?.status === 404 ||
      err.message?.includes('timeout')
    ) {
      // Fallback to local python bridge
      return await executePythonBridge(bridgeAction, payload);
    }
    throw err;
  }
}

exports.getForecast = async (req, res) => {
  try {
    const { productId, horizonDays = 30, datasetId } = req.body;
    const salesData = await getSellerSalesData(req.sellerId, datasetId);

    if (salesData.length === 0) {
      return res.status(400).json({ error: 'No sales data uploaded yet. Please upload sales data first.' });
    }

    const data = await dispatchMlRequest('forecast', {
      sales_data: salesData,
      product_id: productId || null,
      horizon_days: parseInt(horizonDays, 10) || 30
    });

    if (data && data.aggregates) {
      if (data.aggregates.forecast_total_units === undefined) {
        data.aggregates.forecast_total_units =
          data.aggregates[`forecast_${horizonDays}d`] ||
          data.aggregates.forecast_30d ||
          (data.forecasts ? data.forecasts.reduce((acc, f) => acc + (f.predicted_quantity || 0), 0) : 0);
      }
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: `ML Forecast Service error: ${err.message}` });
  }
};

exports.getOpportunityScores = async (req, res) => {
  try {
    const { groupBy = 'state', datasetId } = req.body;
    const salesData = await getSellerSalesData(req.sellerId, datasetId);

    if (salesData.length === 0) {
      return res.status(400).json({ error: 'No sales data uploaded yet. Please upload sales data first.' });
    }

    const data = await dispatchMlRequest('opportunity', {
      sales_data: salesData,
      group_by: groupBy
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: `ML Opportunity Service error: ${err.message}` });
  }
};

exports.getInventoryOptimization = async (req, res) => {
  try {
    const { leadTimeDays = 7, datasetId } = req.body;
    const salesData = await getSellerSalesData(req.sellerId, datasetId);

    if (salesData.length === 0) {
      return res.status(400).json({ error: 'No sales data uploaded yet. Please upload sales data first.' });
    }

    const data = await dispatchMlRequest('inventory', {
      sales_data: salesData,
      lead_time_days: parseInt(leadTimeDays, 10) || 7
    });

    if (data) {
      if (!Array.isArray(data.recommended_transfers)) {
        data.recommended_transfers = Array.isArray(data.transfer_recommendations) ? data.transfer_recommendations : [];
      }
      if (!Array.isArray(data.transfer_recommendations)) {
        data.transfer_recommendations = data.recommended_transfers;
      }
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: `ML Inventory Service error: ${err.message}` });
  }
};

exports.getBundles = async (req, res) => {
  try {
    const { datasetId } = req.body;
    const salesData = await getSellerSalesData(req.sellerId, datasetId);

    if (salesData.length === 0) {
      return res.status(400).json({ error: 'No sales data uploaded yet.' });
    }

    const data = await dispatchMlRequest('bundles', {
      sales_data: salesData
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: `ML Bundle Service error: ${err.message}` });
  }
};

exports.getWarehouseAdvisor = async (req, res) => {
  try {
    const { currentWarehouses, numRecommended = 2, datasetId } = req.body;
    const salesData = await getSellerSalesData(req.sellerId, datasetId);

    if (salesData.length === 0) {
      return res.status(400).json({ error: 'No sales data uploaded yet.' });
    }

    const data = await dispatchMlRequest('warehouse', {
      sales_data: salesData,
      current_warehouses: currentWarehouses,
      num_recommended: parseInt(numRecommended, 10) || 2
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: `ML Warehouse Service error: ${err.message}` });
  }
};

exports.getPricingSimulation = async (req, res) => {
  try {
    const { productId, datasetId } = req.body;
    const salesData = await getSellerSalesData(req.sellerId, datasetId);

    if (salesData.length === 0) {
      return res.status(400).json({ error: 'No sales data uploaded yet.' });
    }

    const data = await dispatchMlRequest('pricing', {
      sales_data: salesData,
      product_id: productId || null
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: `ML Pricing Service error: ${err.message}` });
  }
};

exports.getMarketingIntelligence = async (req, res) => {
  try {
    const { datasetId } = req.body;
    const salesData = await getSellerSalesData(req.sellerId, datasetId);

    if (salesData.length === 0) {
      return res.status(400).json({ error: 'No sales data uploaded yet.' });
    }

    const data = await dispatchMlRequest('marketing', {
      sales_data: salesData
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: `ML Marketing Service error: ${err.message}` });
  }
};

exports.getSellerSalesData = getSellerSalesData;
exports.dispatchMlRequest = dispatchMlRequest;

