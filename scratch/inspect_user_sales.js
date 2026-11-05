const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

async function checkUserSales() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  
  const ankit = await db.collection('users').findOne({ email: 'ankitkumar2006official@gmail.com' });
  if (ankit) {
    console.log('--- ANKIT USER ---', ankit._id);
    const count = await db.collection('sales').countDocuments({ sellerId: ankit._id });
    console.log('Ankit sales count:', count);
    const prods = await db.collection('sales').distinct('productName', { sellerId: ankit._id });
    console.log('Ankit distinct products:', prods);
    const kolkataAnkit = await db.collection('sales').countDocuments({ sellerId: ankit._id, city: /kolkata/i });
    console.log('Ankit sales with Kolkata:', kolkataAnkit);
    const ankitDatasets = await db.collection('sales').distinct('datasetId', { sellerId: ankit._id });
    console.log('Ankit datasets:', ankitDatasets);

    const ankitTotal = await db.collection('sales').aggregate([
      { $match: { sellerId: ankit._id } },
      { $group: { _id: null, rev: { $sum: { $multiply: ['$quantity', '$sellingPrice'] } } } }
    ]).toArray();
    console.log('Ankit total revenue:', ankitTotal[0]?.rev);
  }

  const demo = await db.collection('users').findOne({ email: 'demo.seller@geocommerce.ai' });
  if (demo) {
    console.log('--- DEMO USER ---', demo._id);
    console.log('Demo sales count:', await db.collection('sales').countDocuments({ sellerId: demo._id }));
    const kolkataDemo = await db.collection('sales').countDocuments({ sellerId: demo._id, city: /kolkata/i });
    console.log('Demo sales with Kolkata:', kolkataDemo);
    const demoTotal = await db.collection('sales').aggregate([
      { $match: { sellerId: demo._id } },
      { $group: { _id: null, rev: { $sum: { $multiply: ['$quantity', '$sellingPrice'] } } } }
    ]).toArray();
    console.log('Demo total revenue:', demoTotal[0]?.rev);
  }

  // Check where 46,31,793 came from
  const allSellers = await db.collection('users').find({}).toArray();
  for (const s of allSellers) {
    const sTotal = await db.collection('sales').aggregate([
      { $match: { sellerId: s._id } },
      { $group: { _id: null, rev: { $sum: { $multiply: ['$quantity', '$sellingPrice'] } } } }
    ]).toArray();
    if (sTotal.length > 0) {
      console.log(`Seller ${s.email} (${s._id}): Revenue = ₹${Math.round(sTotal[0].rev)}`);
    }
  }

  await mongoose.disconnect();
}
checkUserSales();
