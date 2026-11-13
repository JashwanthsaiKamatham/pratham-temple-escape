const { Cache } = require('./cache');

/**
 * Single shared cache instance. Kept in its own module so `store.js` and the
 * routes can `require` it without a circular dependency on `index.js`.
 */
let instance = new Cache();

function getCache() {
  return instance;
}

async function initCache(urlString) {
  instance = await new Cache().init(urlString);
  return instance;
}

module.exports = { getCache, initCache };
