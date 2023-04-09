import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import * as utils from "./utils.js";
import smooth from "array-smooth";
import config from "./config.js";
import moment from "moment";
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

function getCoinGeckoData(options, callback) {
  var queryParams = {
    vs_currency: options.vsCurrency,
    days: options.days
  };
  
  request.get(utils.geckoURL("coins/conceal/market_chart", queryParams)).then(response => {
    callback(response.data);
  }).catch(err => {
    console.log(`getCoinGeckoData: ${err.message}`);
    callback(null);
  });
}

function getCustomChart(options, chartData, resultCallback) {
  function makeConfiguration(data) {
    var timeLabels = [];
    var dataPoints = [];
    var dataLength = data.length;
    var durationAsMS = moment.duration(options.days / dataLength, 'd').asMilliseconds();

    data.forEach(function (value) {
      dataPoints.push(value[1]);
    });

    for (let i = dataLength - 1; i >= 0; i--) {
      timeLabels.push(moment().subtract(durationAsMS * (i + 1), 'ms').format(options.dateFormat));
    }

    return {
      type: 'line',
      data: {
        labels: timeLabels,
        datasets: [{
          data: smooth(dataPoints, 3),
          backgroundColor: 'rgba(255,165,0,0.2)',
          fill: true,
          borderWidth: 2,
          pointRadius: 0,
          borderColor: '#FFA500'
        }]
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
            labels: {
              display: false
            }
          }
        },
        scales: {
          yAxes: {
            ticks: {
              maxTicksLimit: 5,
              fontSize: 10,
              callback: function (value, index, values) {
                return options.priceSymbol + value.toFixed(options.priceDecimals);
              }
            },
            grid: {
              display: false
            }
          },
          xAxes: {
            ticks: {
              autoSkip: true,
              maxTicksLimit: options.xPoints,
              maxRotation: 0,
              minRotation: 0
            },
            grid: {
              display: false
            }
          }
        },
        hover: {
          mode: 'nearest',
          intersect: true
        }
      }
    };
  }


  (async () => {
    const canvasRenderService = new ChartJSNodeCanvas({
      width: options.width,
      height: options.height,
    });

    resultCallback(await canvasRenderService.renderToBuffer(makeConfiguration(chartData)));
  })();
}

export function getPriceChart(options, resultCallback) {
  let chartKey = `getPriceChart_${JSON.stringify(options)}`;
  let cacheData = cache.getData(chartKey);

  if (cacheData) {
    resultCallback(cacheData);
  } else {
    getCoinGeckoData(options, function (data) {
      if (data) {
        getCustomChart(options, data.prices, function(chart) {
          cache.setData(chartKey, chart, oPath.get(config, 'cache.charts.expire', config.cache.default));
          resultCallback(chart);
        });
      } else {
        resultCallback(null);
      }
    });
  }
};

export function getVolumeChart(options, resultCallback) {
  let chartKey = `getVolumeChart_${JSON.stringify(options)}`;
  let cacheData = cache.getData(chartKey);

  if (cacheData) {
    resultCallback(cacheData);
  } else {
    getCoinGeckoData(options, function (data) {
      if (data) {
        getCustomChart(options, data.total_volumes, function(chart) {
          cache.setData(chartKey, chart, oPath.get(config, 'cache.charts.expire', config.cache.default));
          resultCallback(chart);
        });
      } else {
        resultCallback(null);
      }
    });
  }
};

export function getMarketcapChart(options, resultCallback) {
  let chartKey = `getMarketcapChart_${JSON.stringify(options)}`;
  let cacheData = cache.getData(chartKey);

  if (cacheData) {
    resultCallback(cacheData);
  } else {
    getCoinGeckoData(options, function (data) {
      if (data) {
        getCustomChart(options, data.market_caps, function(chart) {
          cache.setData(chartKey, chart, oPath.get(config, 'cache.charts.expire', config.cache.default));
          resultCallback(chart);
        });
      } else {
        resultCallback(null);
      }
    });
  }
};