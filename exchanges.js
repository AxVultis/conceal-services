import path, { dirname } from "path";
import { fileURLToPath } from 'url';
import { truncate } from "fs/promises";
import fs from "graceful-fs";
import config from "./config.js";
import oPath from "object-path";

// set the global cache instance
import globalCache from "./cache.js";
let cache = new globalCache().getInstance();

// set local filename and dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function checkIfMatches(parameter, value, partial) {
  let matches = true;

  if (partial) {
    if (!value || !(((value.toUpperCase().indexOf(parameter.toUpperCase())) > -1) || (parameter === "*"))) {
      matches = false;
    }
  } else {
    if (!value || (value.toUpperCase() !== parameter.toUpperCase())) {
      matches = false;
    }
  }

  return matches;
}

export function getExchangesList(req, resultCallback) {
  let exchangesKey = `getExchangesList_${JSON.stringify(req.query)}`;
  let cacheData = cache.getData(exchangesKey);

  if (cacheData) {
    resultCallback({success: true, data: cacheData});
  } else {
    fs.readFile(path.join(__dirname, 'data', 'exchanges.json'), 'utf8', function (err, data) {
      if (err) {
        resultCallback({success: false, error: err});
      } else {
        let partial = req.query.partial ? req.query.partial.toUpperCase() == "TRUE" : false;
        let exchangeData = JSON.parse(data).exchanges.filter(function (exchange) {
          if (req.query.name) {
            if (!checkIfMatches(req.query.name, exchange.name, partial)) {
              return false;
            }
          }

          if (req.query.address) {
            if (!checkIfMatches(req.query.address, exchange.address, partial)) {
              return false;
            }
          }

          if (req.query.paymentId) {
            if (!checkIfMatches(req.query.paymentId, exchange.paymentId, partial)) {
              return false;
            }
          }

          return true;
        });
        
        cache.setData(exchangesKey, exchangeData, oPath.get(config, 'cache.exchanges.list.expire', config.cache.default));
        resultCallback({success: true, data: exchangeData});
      }
    });
  }
};