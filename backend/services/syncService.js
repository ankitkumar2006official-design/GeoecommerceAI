const Product = require('../models/Product');
const Order = require('../models/Order');
const Inventory = require('../models/Inventory');
const Analytics = require('../models/Analytics');

/**
 * Synchronizes derived collections (Product, Order, Inventory, Analytics)
 * from sales transactions for seller-specific data isolation and fast querying.
 */
async function syncDerivedCollections(sellerId, salesDocs) {
  if (!salesDocs || salesDocs.length === 0) return;

  try {
    const productMap = new Map();
    const orderMap = new Map();

    for (const doc of salesDocs) {
      // 1. Group into Products
      if (!productMap.has(doc.productId)) {
        const invQty = parseInt(doc.inventoryQuantity, 10) || 50;
        productMap.set(doc.productId, {
          sellerId,
          productId: doc.productId,
          name: doc.productName,
          category: doc.category,
          costPrice: parseFloat(doc.costPrice) || 0,
          sellingPrice: parseFloat(doc.sellingPrice) || 0,
          inventoryQuantity: invQty,
          leadTimeDays: 7,
          safetyStock: Math.max(10, Math.round(invQty * 0.2)),
          reorderPoint: Math.max(20, Math.round(invQty * 0.4))
        });
      }

      // 2. Group into Orders
      if (!orderMap.has(doc.orderId)) {
        orderMap.set(doc.orderId, {
          sellerId,
          orderId: doc.orderId,
          orderDate: doc.orderDate,
          pincode: doc.pincode,
          city: doc.city,
          district: doc.district,
          state: doc.state,
          region: doc.region,
          items: [],
          totalAmount: 0,
          shippingCost: parseFloat(doc.shippingCost) || 0,
          returnStatus: doc.returnStatus || 'No',
          cancellationStatus: doc.cancellationStatus || 'No'
        });
      }

      const order = orderMap.get(doc.orderId);
      order.items.push({
        productId: doc.productId,
        productName: doc.productName,
        category: doc.category,
        quantity: parseInt(doc.quantity, 10) || 1,
        price: parseFloat(doc.sellingPrice) || 0,
        cost: parseFloat(doc.costPrice) || 0
      });
      order.totalAmount += (parseInt(doc.quantity, 10) || 1) * (parseFloat(doc.sellingPrice) || 0);
    }

    // Batch upsert Products
    const productOps = Array.from(productMap.values()).map((prod) => ({
      updateOne: {
        filter: { sellerId, productId: prod.productId },
        update: { $set: prod },
        upsert: true
      }
    }));
    if (productOps.length > 0) {
      await Product.bulkWrite(productOps, { ordered: false });
    }

    // Batch upsert Orders
    const orderOps = Array.from(orderMap.values()).map((ord) => ({
      updateOne: {
        filter: { sellerId, orderId: ord.orderId },
        update: { $set: ord },
        upsert: true
      }
    }));
    if (orderOps.length > 0) {
      await Order.bulkWrite(orderOps, { ordered: false });
    }

    // Batch upsert Inventory records
    const invOps = Array.from(productMap.values()).map((prod) => {
      const status = prod.inventoryQuantity <= 15
        ? 'Critical'
        : prod.inventoryQuantity <= prod.reorderPoint
          ? 'Low Stock'
          : 'Optimal';
      return {
        updateOne: {
          filter: { sellerId, productId: prod.productId },
          update: {
            $set: {
              sellerId,
              productId: prod.productId,
              productName: prod.name,
              category: prod.category,
              currentStock: prod.inventoryQuantity,
              safetyStock: prod.safetyStock,
              reorderPoint: prod.reorderPoint,
              unitCost: prod.costPrice,
              unitPrice: prod.sellingPrice,
              status,
              updatedAt: new Date()
            }
          },
          upsert: true
        }
      };
    });
    if (invOps.length > 0) {
      await Inventory.bulkWrite(invOps, { ordered: false });
    }

    // Persist Analytics Snapshot
    const totalRevenue = salesDocs.reduce((acc, s) => acc + (s.quantity * s.sellingPrice), 0);
    const totalUnits = salesDocs.reduce((acc, s) => acc + s.quantity, 0);
    const totalCost = salesDocs.reduce((acc, s) => acc + (s.quantity * (s.costPrice || 0)), 0);
    const grossProfit = totalRevenue - totalCost;
    const marginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    await Analytics.findOneAndUpdate(
      { sellerId, period: 'ALL_TIME' },
      {
        $set: {
          sellerId,
          snapshotDate: new Date(),
          period: 'ALL_TIME',
          totalRevenue: Math.round(totalRevenue),
          totalUnits,
          totalOrders: orderMap.size,
          grossProfit: Math.round(grossProfit),
          profitMarginPct: Math.round(marginPct * 10) / 10,
          createdAt: new Date()
        }
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.warn(`[SyncService] Warning while synchronizing collections: ${err.message}`);
  }
}

/**
 * Cleans up all collections for a seller (when resetting or deleting demo data)
 */
async function clearSellerCollections(sellerId) {
  await Promise.allSettled([
    Product.deleteMany({ sellerId }),
    Order.deleteMany({ sellerId }),
    Inventory.deleteMany({ sellerId }),
    Analytics.deleteMany({ sellerId })
  ]);
}

module.exports = {
  syncDerivedCollections,
  clearSellerCollections
};
