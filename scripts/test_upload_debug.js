const { startServer } = require('../backend/server');
const axios = require('../backend/node_modules/axios');
const FormData = require('../backend/node_modules/form-data');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://127.0.0.1:5000/api';

async function testUpload() {
  const server = await startServer();
  try {
    // 1. Register test user
    const regRes = await axios.post(`${API_URL}/auth/register`, {
      name: 'Upload Tester',
      email: `upload_test_${Date.now()}@test.in`,
      password: 'Password123!',
      storeName: 'Test Store'
    });
    const token = regRes.data.token;
    console.log('Registered, token:', token ? 'OK' : 'MISSING');

    // 2. Upload invalid CSV
    const invalidCsvContent = [
      'Order ID,Product ID,Product Name,Product Category,Order Date,Delivery PIN Code,Quantity,Selling Price',
      'ORD-BAD-1,PROD-1,Valid Item,Electronics,2026-01-01,400001,-5,1000'
    ].join('\n');

    const invalidForm = new FormData();
    invalidForm.append('file', Buffer.from(invalidCsvContent), {
      filename: 'corrupted.csv',
      contentType: 'text/csv'
    });

    console.log('Sending corrupted file upload...');
    const res1 = await axios.post(`${API_URL}/sales/upload`, invalidForm, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...invalidForm.getHeaders()
      }
    });
    console.log('Corrupted upload response:', res1.status, res1.data);

    // 3. Upload 800 CSV
    const csv800Path = path.resolve(__dirname, '../data/sample_sales_data_800.csv');
    const validForm = new FormData();
    validForm.append('file', fs.createReadStream(csv800Path), {
      filename: 'sample_sales_data_800.csv',
      contentType: 'text/csv'
    });

    console.log('Sending 800 valid file upload...');
    const res2 = await axios.post(`${API_URL}/sales/upload`, validForm, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...validForm.getHeaders()
      }
    });
    console.log('800 upload response:', res2.status, res2.data.summary);
  } catch (err) {
    console.error('Upload Error:', err.response?.status, err.response?.data || err.message);
  } finally {
    if (server) server.close();
    process.exit(0);
  }
}

testUpload();
