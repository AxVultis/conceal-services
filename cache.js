import NodeCache from "node-cache";
import config from "./config.js";

export class Cache {
  constructor() {
    this.nodeCache = new NodeCache({ stdTTL: config.cache.default }); // the cache object
  }

  setData = (key, data, expire) => {
    return this.nodeCache.set(key, data, expire);
  }

  getData = (key) => {
    return this.nodeCache.get(key);
  }
}

class Singleton {
  constructor() {
    if (!Singleton.instance) {
      Singleton.instance = new Cache();
    }
  }

  getInstance() {
    return Singleton.instance;
  }  
}

export default Singleton;