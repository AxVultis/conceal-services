import schedule from  "node-schedule";
import NodeCache from "node-cache";
import config from "./config.js";
import moment from "moment";
import geoip from "geoip-lite";
import axios from "axios";

export class nodes {
  constructor() {
    this.geoJSONArray = [];

    this.addressList = [
      config.services.api + "/getpeers"
    ];

    this.request = axios.create({
      timeout: 60000, // 2 seconds
      headers:{
        'User-Agent': 'Conceal Services'
      }
    });

    this.nodeCache = new NodeCache({ stdTTL: config.nodes.cache.expire, checkperiod: config.nodes.cache.checkPeriod }); // the cache object
    this.dataSchedule = schedule.scheduleJob('* */6 * * *', () => {
      this.updateGeoData();
    });

    this.updateGeoData();
  }

  updateGeoData = () => {
    this.geoJSONArray = [];
    var counter = 0;

    const checkForProcessingEnd = () => {
      counter++;

      // check if we have processed all nodes
      if (counter >= this.addressList.length) {
        let nodeKeys = this.nodeCache.keys();

        for (let i = 0; i < nodeKeys.length; i++) {
          this.geoJSONArray.push(this.nodeCache.get(nodeKeys[i]));
        }
      }
    }

    this.request.get( config.services.pool + "/list?isReachable=true").then(response => {
      let data = response.data;

      if (data.success) {
        data.list.forEach((value) => {
          var address = `http://${value.nodeHost}:${value.nodePort}/getpeers`;

          if (this.addressList.indexOf(address) == -1) {
            this.addressList.push(address);
          }
        });

        // now loop all the addressed from the list
        this.addressList.forEach((value) => {
          this.request.get(value).then(response => {
            let data = response.data;

            try {
              data.peers.forEach((value) => {
                var ipAddress = value.substr(0, value.indexOf(':'));

                var nodeData = {
                  ipAddress: ipAddress,
                  lastSeen: moment(),
                  geoData: geoip.lookup(ipAddress)
                };

                // set the node data under the IP key and set its expiration time
                this.nodeCache.set(ipAddress, nodeData, config.nodes.cache.expire);
              });
            } catch(err) {
              console.log('Error:', err.message);
            } finally {
              checkForProcessingEnd();
            } 
          }).catch(err => {
            console.log('Error:', err.message);
            checkForProcessingEnd();
          });
        });
      }
    }).catch(err => {
      console.log('Error:', err.message);
    });
  }

  getGeoData = (options) => {
    return this.geoJSONArray;
  }
}