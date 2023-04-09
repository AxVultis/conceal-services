// Copyright (c) 2020-2022, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

import path, { dirname } from "path";
import { fileURLToPath } from 'url';
import config from "./config.js";
import oPath from "object-path";
import axios from "axios";
import fs from "graceful-fs";

// set the global cache instance
import globalCache from "./cache.js";
let cache = new globalCache().getInstance();

// set local filename and dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const request = axios.create({
  timeout: 2000, // 2 seconds
  headers:{
    'User-Agent': 'Conceal Services'
  }
});

function shuffle(a) {
  var j, x, i;
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
}

export function getPoolList(resultCallback) {
  let cacheData = cache.getData('getPoolList');

  if (cacheData) {
    resultCallback({success: true, data: cacheData});
  } else {
    try {
      fs.readFile(path.join(__dirname, 'data', 'pools.json'), 'utf8', function (err, data) {
        if (err) {
          resultCallback({success: false, error: err});
        } else {
          let poolData = shuffle(JSON.parse(data).ccx);
          cache.setData('getPoolList', poolData, oPath.get(config, 'cache.pools.list.expire', config.cache.default));
          resultCallback({success: true, data: poolData});
        }
      });
    } catch(err) {
      resultCallback({success: false, error: err});
    }
  }
};

export function getPoolData(resultCallback) {
  let cacheData = cache.getData('getPoolData');

  if (cacheData) {
    resultCallback({success: true, data: cacheData});
  } else {
    fs.readFile(path.join(__dirname, 'data', 'pools.json'), 'utf8', function (err, data) {
      if (err) {
        resultCallback({success: false, error: err});
      } else {
        var poolData = [];
        var counter = 0;

        shuffle(JSON.parse(data).ccx).forEach(function (element, index, array) {
          var host = element[0];
          var urls = element[1];
          var name = element[2];
          var version = element[3];

          function checkForQueryFinished() {
            counter++;
            if (counter === array.length) {
              cache.setData('getPoolData', poolData, oPath.get(config, 'cache.pools.data.expire', config.cache.default));
              resultCallback({success: true, data: poolData});
            }
          }

          request.get(urls[0]).then(response => {
            let data = response.data;

            switch (version) {
              case "1":
                try {
                  if (!data.pool) {
                    data.pool = {};
                  }

                  poolData.push({
                    'info': {
                      'host': host,
                      'name': name
                    },
                    'network': {
                      'height': data.network ? (data.network.height || 0) : 0,
                    },
                    'pool': {
                      'lastBlockFound': parseInt(data.pool.lastBlockFound || 0),
                      'hashrate': data.pool.soloHashrate ? (data.pool.soloHashrate + (data.pool.hashrate || 0)) : (data.pool.hashrate || 0),
                      'miners': data.pool.soloMiners ? (data.pool.soloMiners + (data.pool.miners || 0)) : (data.pool.miners || 0)
                    },
                    'config': {
                      'minPaymentThreshold': data.config ? data.config.minPaymentThreshold || 0 : 0,
                      'poolFee': data.config ? data.config.fee || 0 : 0
                    }
                  });
                  checkForQueryFinished();
                } catch (err) {
                  console.log(`Error trying to parse pool info: ${err}`);
                  checkForQueryFinished();
                }
                break;
              case "2":
                try {
                  var dataObject = {
                    'info': {
                      'host': host,
                      'name': name
                    },
                    'network': {
                      'height': '',
                    },
                    'pool': {
                      'lastBlockFound': data.pool_statistics ? parseInt(data.pool_statistics.lastBlockFoundTime || 0) * 1000 : 0,
                      'hashrate': data.pool_statistics ? data.pool_statistics.hashRate || 0 : 0,
                      'miners': data.pool_statistics ? data.pool_statistics.miners || 0 : 0
                    },
                    'config': {
                      'minPaymentThreshold': '',
                      'poolFee': ''
                    }
                  };
                } catch (err) {
                  console.log(`Error trying to parse pool info: ${err}`);
                }

                request.get(urls[1]).then(response => {
                  let network = response.data;
                  dataObject.network.height = network.height || 0;

                  request.get(urls[2]).then(response => {
                    let config = response.data;

                    try {
                      dataObject.config.minPaymentThreshold = config.min_wallet_payout || 0;
                      dataObject.config.poolFee = config.pplns_fee || 0;

                      poolData.push(dataObject);
                      checkForQueryFinished();
                    } catch (err) {
                      console.log(`Error trying to parse pool info: ${err}`);
                      checkForQueryFinished();
                    }
                  }).catch(err => {
                    console.log(urls[2] + ' -> Status:', err.message);
                    checkForQueryFinished();
                  });
                }).catch(err => {
                  console.log(urls[1] + ' -> Status:', err.message);
                  checkForQueryFinished();
                });
                break;
              case "3":
                try {
                  poolData.push({
                    'info': {
                      'host': host,
                      'name': name
                    },
                    'network': {
                      'height': data.network_statistics.height || 0,
                    },
                    'pool': {
                      'lastBlockFound': parseInt(data.pool_statistics.collective.lastFoundBlock.ts || 0) * 1000,
                      'hashrate': data.pool_statistics.collective.hashRate || 0,
                      'miners': data.pool_statistics.collective.miners || 0
                    },
                    'config': {
                      'minPaymentThreshold': data.config.min_wallet_payout || 0,
                      'poolFee': data.config.pplns_fee || 0
                    }
                  });
                  checkForQueryFinished();
                } catch (err) {
                  console.log(`Error trying to parse pool info: ${err}`);
                  checkForQueryFinished();
                }
                break;
              default:
                resultCallback({success: false, error: { message: "wrong version" }});
            }
          }).catch(err => {
            console.log(urls[0] + ' -> Status:', err.message);
            checkForQueryFinished();
          });
        });
      }
    });
  }
};