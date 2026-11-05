const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { InMemoryModel, generateObjectId } = require('../config/inMemoryStore');

let useInMemory = false;

function setInMemoryMode(enabled) {
  useInMemory = enabled;
}

function getModel(name, mongooseModel) {
  const inMem = new InMemoryModel(name);

  // Return a proxy that directs calls to mongooseModel or inMem depending on connection state
  return new Proxy(mongooseModel, {
    get(target, prop) {
      if (useInMemory || mongoose.connection.readyState !== 1) {
        if (typeof inMem[prop] === 'function') {
          return inMem[prop].bind(inMem);
        }
        return inMem[prop];
      }
      return target[prop];
    },
    construct(target, argumentsList) {
      if (useInMemory || mongoose.connection.readyState !== 1) {
        const raw = argumentsList[0] || {};
        const doc = {
          ...raw,
          _id: raw._id || inMem.generateId(),
          createdAt: raw.createdAt || new Date()
        };

        if (name === 'User') {
          doc.comparePassword = async function(candidate) {
            return bcrypt.compare(candidate, this.password);
          };
        }

        doc.save = async function() {
          if (name === 'User' && this.password && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
          }
          await inMem.create(this);
          return this;
        };

        return doc;
      }
      return new target(...argumentsList);
    }
  });
}

module.exports = { getModel, setInMemoryMode };
