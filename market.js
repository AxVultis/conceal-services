import * as utils from "./utils.js";
import config from "./config.js";
import oPath from "object-path";
import axios from "axios";

// set the global cache instance
import globalCache from "./cache.js";
let cache = new globalCache().getInstance();

const request = axios.create({
  timeout: 10000, // 10 seconds
  headers:{
    'User-Agent': 'Conceal Services'
  }
});

export function getMarketInfo(req, resultCallback) {
  var queryParams = {
    ids: 'Conceal',
    vs_currencies: req.query.vsCurrencies || 'USD',
    include_market_cap: true,
    include_24hr_vol: true,
    include_24hr_change: true
  };

  let marketKey = `getMarketInfo_${JSON.stringify(queryParams)}`
  let cacheData = cache.getData(marketKey);

  if (cacheData) {
    resultCallback({success: true, data: cacheData});
  } else {
    request.get(utils.geckoURL("simple/price", queryParams)).then(response => {
      cache.setData(marketKey, response.data, oPath.get(config, 'cache.market.expire', config.cache.default));
      resultCallback({success: true, data: response.data});
    }).catch(err => {
      console.log(`getMarketInfo: ${err.message}`);
      throw err;
    });
  }
};

export function getMarketHistory(req, resultCallback) {
  var queryParams = {
    vs_currency: req.query.vsCurrency || 'USD',
    days: req.query.days || 7
  };

  let marketKey = `getMarketHistory_${JSON.stringify(queryParams)}`
  let cacheData = cache.getData(marketKey);

  if (cacheData) {
    resultCallback({success: true, data: cacheData});
  } else {
    request.get(utils.geckoURL("coins/conceal/market_chart", queryParams)).then(response => {
      cache.setData(marketKey, response.data, oPath.get(config, 'cache.market.expire', config.cache.default));
      resultCallback({success: true, data: response.data});
    }).catch(err => {
      console.log(`getMarketHistory: ${err.message}`);
      throw err;
    });
  }
};