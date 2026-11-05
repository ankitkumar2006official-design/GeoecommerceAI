const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// In-Memory Storage Collections
const collections = {
  users: [],
  sales: [],
  products: [],
  orders: [],
  inventories: [],
  analytics: [],
  uploadlogs: [],
  scenarios: []
};

function generateObjectId() {
  return crypto.randomBytes(12).toString('hex');
}

// Evaluation helpers for MongoDB expressions
function getFieldVal(obj, path) {
  if (!path) return undefined;
  if (path.startsWith('$')) path = path.slice(1);
  const parts = path.split('.');
  let curr = obj;
  for (const p of parts) {
    if (curr == null) return undefined;
    curr = curr[p];
  }
  return curr;
}

function matchesFilter(doc, filter = {}) {
  for (const [key, expected] of Object.entries(filter)) {
    if (key === '$or') {
      const matched = expected.some((subFilter) => matchesFilter(doc, subFilter));
      if (!matched) return false;
      continue;
    }
    if (key === '$and') {
      const matched = expected.every((subFilter) => matchesFilter(doc, subFilter));
      if (!matched) return false;
      continue;
    }

    const actual = doc[key];

    if (expected instanceof RegExp) {
      if (!expected.test(String(actual || ''))) return false;
    } else if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
      if (expected.$in && !expected.$in.includes(actual)) return false;
      if (expected.$gte && !(new Date(actual) >= new Date(expected.$gte))) return false;
      if (expected.$lte && !(new Date(actual) <= new Date(expected.$lte))) return false;
      if (expected.$gt && !(actual > expected.$gt)) return false;
      if (expected.$lt && !(actual < expected.$lt)) return false;
      if (expected.$ne && actual === expected.$ne) return false;
    } else if (String(actual) !== String(expected)) {
      return false;
    }
  }
  return true;
}

function evaluateExpr(expr, doc) {
  if (expr == null) return null;
  if (typeof expr === 'string' && expr.startsWith('$')) {
    return getFieldVal(doc, expr);
  }
  if (typeof expr !== 'object' || Array.isArray(expr)) {
    return expr;
  }

  // Operator evaluation
  if (expr.$multiply) {
    const vals = expr.$multiply.map((e) => evaluateExpr(e, doc) || 0);
    return vals.reduce((a, b) => a * b, 1);
  }
  if (expr.$subtract) {
    return (evaluateExpr(expr.$subtract[0], doc) || 0) - (evaluateExpr(expr.$subtract[1], doc) || 0);
  }
  if (expr.$divide) {
    const denom = evaluateExpr(expr.$divide[1], doc) || 1;
    return (evaluateExpr(expr.$divide[0], doc) || 0) / denom;
  }
  if (expr.$round) {
    const val = evaluateExpr(expr.$round[0], doc) || 0;
    const decimals = expr.$round[1] || 0;
    const factor = Math.pow(10, decimals);
    return Math.round(val * factor) / factor;
  }
  if (expr.$year) {
    const d = new Date(evaluateExpr(expr.$year, doc));
    return isNaN(d) ? 2026 : d.getFullYear();
  }
  if (expr.$month) {
    const d = new Date(evaluateExpr(expr.$month, doc));
    return isNaN(d) ? 1 : d.getMonth() + 1;
  }
  if (expr.$toString) {
    return String(evaluateExpr(expr.$toString, doc) ?? '');
  }
  if (expr.$concat) {
    return expr.$concat.map((e) => String(evaluateExpr(e, doc) ?? '')).join('');
  }
  if (expr.$toLower) {
    return String(evaluateExpr(expr.$toLower, doc) ?? '').toLowerCase();
  }
  if (expr.$cond) {
    let ifCond, thenVal, elseVal;
    if (Array.isArray(expr.$cond)) {
      [ifCond, thenVal, elseVal] = expr.$cond;
    } else {
      ifCond = expr.$cond.if;
      thenVal = expr.$cond.then;
      elseVal = expr.$cond.else;
    }
    const condPassed = evaluateExpr(ifCond, doc);
    return condPassed ? evaluateExpr(thenVal, doc) : evaluateExpr(elseVal, doc);
  }
  if (expr.$in) {
    const item = evaluateExpr(expr.$in[0], doc);
    const list = expr.$in[1] || [];
    return list.includes(item);
  }
  if (expr.$gt) {
    return (evaluateExpr(expr.$gt[0], doc) || 0) > (evaluateExpr(expr.$gt[1], doc) || 0);
  }
  if (expr.$lt) {
    return (evaluateExpr(expr.$lt[0], doc) || 0) < (evaluateExpr(expr.$lt[1], doc) || 0);
  }
  if (expr.$lte) {
    return (evaluateExpr(expr.$lte[0], doc) || 0) <= (evaluateExpr(expr.$lte[1], doc) || 0);
  }
  if (expr.$size) {
    const arr = evaluateExpr(expr.$size, doc) || [];
    return Array.isArray(arr) ? arr.length : 0;
  }

  return expr;
}

// Chainable Query Builder
class QueryBuilder {
  constructor(dataPromise) {
    this.dataPromise = dataPromise;
  }
  select() { return this; }
  sort(sortObj = {}) {
    this.dataPromise = this.dataPromise.then((items) => {
      return [...items].sort((a, b) => {
        for (const [key, dir] of Object.entries(sortObj)) {
          if (a[key] < b[key]) return dir === 1 ? -1 : 1;
          if (a[key] > b[key]) return dir === 1 ? 1 : -1;
        }
        return 0;
      });
    });
    return this;
  }
  limit(n) {
    this.dataPromise = this.dataPromise.then((items) => items.slice(0, n));
    return this;
  }
  lean() { return this; }
  then(resolve, reject) {
    return this.dataPromise.then(resolve, reject);
  }
  catch(reject) {
    return this.dataPromise.catch(reject);
  }
}

class InMemoryModel {
  constructor(name, schema) {
    this.name = name;
    this.colName = name.toLowerCase() + 's';
    if (!collections[this.colName]) {
      collections[this.colName] = [];
    }
  }

  generateId() {
    return generateObjectId();
  }

  find(filter = {}) {
    const p = Promise.resolve().then(() => {
      const items = collections[this.colName].filter((d) => matchesFilter(d, filter));
      return items.map((i) => ({ ...i }));
    });
    return new QueryBuilder(p);
  }

  findOne(filter = {}) {
    const p = Promise.resolve().then(() => {
      const item = collections[this.colName].find((d) => matchesFilter(d, filter));
      if (!item) return null;
      const doc = { ...item };
      if (this.name === 'User') {
        doc.comparePassword = async (candidate) => bcrypt.compare(candidate, doc.password);
        doc.save = async () => {
          const idx = collections[this.colName].findIndex((u) => u._id === doc._id);
          if (idx >= 0) collections[this.colName][idx] = { ...doc };
          return doc;
        };
      }
      return doc;
    });
    return new QueryBuilder(p);
  }

  findById(id) {
    return this.findOne({ _id: id });
  }

  async countDocuments(filter = {}) {
    return collections[this.colName].filter((d) => matchesFilter(d, filter)).length;
  }

  async create(data) {
    if (Array.isArray(data)) {
      return this.insertMany(data);
    }
    const doc = { ...data, _id: data._id || generateObjectId(), createdAt: new Date() };
    if (this.name === 'User' && doc.password) {
      if (!doc.password.startsWith('$2a$') && !doc.password.startsWith('$2b$')) {
        const salt = await bcrypt.genSalt(10);
        doc.password = await bcrypt.hash(doc.password, salt);
      }
      doc.comparePassword = async (candidate) => bcrypt.compare(candidate, doc.password);
      doc.save = async () => {
        const idx = collections[this.colName].findIndex((u) => u._id === doc._id);
        if (idx >= 0) collections[this.colName][idx] = { ...doc };
        return doc;
      };
    }
    collections[this.colName].push(doc);
    return doc;
  }

  async insertMany(docs) {
    const inserted = docs.map((d) => ({
      ...d,
      _id: d._id || generateObjectId(),
      createdAt: d.createdAt || new Date()
    }));
    collections[this.colName].push(...inserted);
    return inserted;
  }

  async bulkWrite(ops = []) {
    for (const op of ops) {
      if (op.updateOne) {
        const { filter, update, upsert } = op.updateOne;
        await this.findOneAndUpdate(filter, update, { upsert });
      } else if (op.insertOne) {
        await this.create(op.insertOne.document);
      }
    }
    return { ok: 1 };
  }

  async findOneAndUpdate(filter = {}, update = {}, options = {}) {
    let doc = collections[this.colName].find((d) => matchesFilter(d, filter));
    if (!doc && options.upsert) {
      const newDoc = {
        _id: generateObjectId(),
        createdAt: new Date(),
        ...filter
      };
      if (update.$set) {
        Object.assign(newDoc, update.$set);
      } else {
        Object.assign(newDoc, update);
      }
      collections[this.colName].push(newDoc);
      return newDoc;
    }
    if (doc) {
      if (update.$set) {
        Object.assign(doc, update.$set);
      } else {
        Object.assign(doc, update);
      }
      return doc;
    }
    return null;
  }

  async updateOne(filter = {}, update = {}) {
    const doc = collections[this.colName].find((d) => matchesFilter(d, filter));
    if (doc) {
      if (update.$set) {
        Object.assign(doc, update.$set);
      } else {
        Object.assign(doc, update);
      }
      return { matchedCount: 1, modifiedCount: 1 };
    }
    return { matchedCount: 0, modifiedCount: 0 };
  }

  async deleteMany(filter = {}) {
    const initial = collections[this.colName].length;
    collections[this.colName] = collections[this.colName].filter((d) => !matchesFilter(d, filter));
    return { deletedCount: initial - collections[this.colName].length };
  }

  async aggregate(pipeline = []) {
    let current = [...collections[this.colName]];

    for (const stage of pipeline) {
      if (stage.$match) {
        current = current.filter((doc) => matchesFilter(doc, stage.$match));
      } else if (stage.$group) {
        const groupSpec = stage.$group;
        const groups = {};

        for (const doc of current) {
          // Compute group key
          let keyVal;
          if (groupSpec._id === null) {
            keyVal = 'GLOBAL';
          } else if (typeof groupSpec._id === 'string' && groupSpec._id.startsWith('$')) {
            keyVal = String(evaluateExpr(groupSpec._id, doc) ?? '');
          } else if (typeof groupSpec._id === 'object') {
            const compound = {};
            for (const [k, v] of Object.entries(groupSpec._id)) {
              compound[k] = evaluateExpr(v, doc);
            }
            keyVal = JSON.stringify(compound);
          } else {
            keyVal = String(groupSpec._id);
          }

          if (!groups[keyVal]) {
            groups[keyVal] = {
              _key: groupSpec._id,
              _docs: [],
              accumulators: {}
            };
          }
          groups[keyVal]._docs.push(doc);
        }

        const groupedResults = [];
        for (const g of Object.values(groups)) {
          const resultDoc = {};
          if (groupSpec._id === null) {
            resultDoc._id = null;
          } else if (typeof groupSpec._id === 'object') {
            const parsed = JSON.parse(Object.keys(groups).find((k) => groups[k] === g));
            resultDoc._id = parsed;
          } else {
            resultDoc._id = evaluateExpr(groupSpec._id, g._docs[0]);
          }

          // Evaluate aggregators
          for (const [field, acc] of Object.entries(groupSpec)) {
            if (field === '_id') continue;

            if (acc.$sum !== undefined) {
              if (acc.$sum === 1) {
                resultDoc[field] = g._docs.length;
              } else {
                resultDoc[field] = g._docs.reduce((sum, d) => sum + (evaluateExpr(acc.$sum, d) || 0), 0);
              }
            } else if (acc.$avg !== undefined) {
              const sum = g._docs.reduce((s, d) => s + (evaluateExpr(acc.$avg, d) || 0), 0);
              resultDoc[field] = g._docs.length > 0 ? sum / g._docs.length : 0;
            } else if (acc.$first !== undefined) {
              resultDoc[field] = evaluateExpr(acc.$first, g._docs[0]);
            } else if (acc.$last !== undefined) {
              resultDoc[field] = evaluateExpr(acc.$last, g._docs[g._docs.length - 1]);
            } else if (acc.$addToSet !== undefined) {
              const set = new Set();
              g._docs.forEach((d) => set.add(evaluateExpr(acc.$addToSet, d)));
              resultDoc[field] = Array.from(set);
            } else if (acc.$push !== undefined) {
              resultDoc[field] = g._docs.map((d) => evaluateExpr(acc.$push, d));
            }
          }
          groupedResults.push(resultDoc);
        }
        current = groupedResults;
      } else if (stage.$sort) {
        const sortSpec = stage.$sort;
        current.sort((a, b) => {
          for (const [key, dir] of Object.entries(sortSpec)) {
            const va = getFieldVal(a, key);
            const vb = getFieldVal(b, key);
            if (va < vb) return dir === 1 ? -1 : 1;
            if (va > vb) return dir === 1 ? 1 : -1;
          }
          return 0;
        });
      } else if (stage.$limit) {
        current = current.slice(0, stage.$limit);
      } else if (stage.$project) {
        const projSpec = stage.$project;
        current = current.map((doc) => {
          const out = {};
          if (projSpec._id !== 0) out._id = doc._id;
          for (const [k, v] of Object.entries(projSpec)) {
            if (k === '_id' && v === 0) continue;
            if (v === 1) {
              out[k] = doc[k];
            } else {
              out[k] = evaluateExpr(v, doc);
            }
          }
          return out;
        });
      }
    }

    return current;
  }
}

module.exports = {
  InMemoryModel,
  collections,
  generateObjectId
};
