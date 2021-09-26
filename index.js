require('dotenv').config({path: './.env'});
const express = require("express");
const landing = require('./landingTemplate');
const addon = express();
const axios = require('axios')
const subtitlePageFinder = require("./lib/subtitlePageFinder");
const config = require('./config');
const MANIFEST = require('./manifest');
const { HttpProxyAgent, HttpsProxyAgent } = require("hpagent");
const proxy = process.env.PROXY_LINK;

const agentConfig = {
  proxy: proxy,
  keepAlive: true,
  keepAliveMsecs: 2000,
  maxSockets: 256,
  maxFreeSockets: 256,
};

axios.defaults.httpAgent = new HttpProxyAgent(agentConfig);
axios.defaults.httpsAgent = new HttpsProxyAgent(agentConfig);

const CACHE_MAX_AGE = 4 * 60 * 60; // 4 hours in seconds
const STALE_REVALIDATE_AGE = 4 * 60 * 60; // 4 hours
const STALE_ERROR_AGE = 7 * 24 * 60 * 60; // 7 days

var respond = function (res, data) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');
  res.send(data);
};

addon.get('/', function (req, res) {
  res.set('Content-Type', 'text/html');
	res.send(landing(MANIFEST));
});

addon.get('/manifest.json', function (req, res) {
  respond(res, MANIFEST);
});

addon.get('/download/:idid\-:altid.zip', async function (req, res) {
  try {
    res.set('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, stale-while-revalidate:${STALE_REVALIDATE_AGE}, stale-if-error:${STALE_ERROR_AGE}`);
    
    const response = await axios({url: 'https://turkcealtyazi.org/ind', method: "POST", headers: {"Accept": 'application/zip'}, data:`idid=${req.params.idid}&altid=${req.params.altid}`, responseEncoding: "null", responseType: 'arraybuffer'});
    return res.send(response.data)
    
  } catch (err) {
    console.log(err)
    return res.send("Couldn't get the subtitle.")
  }
});

addon.get('/subtitles/:type/:imdbId/:query.json', async (req, res) => {
  try {
    let videoId =  req.params.imdbId.split(":")[0]
    let season = Number(req.params.imdbId.split(":")[1])
    let episode = Number(req.params.imdbId.split(":")[2])
    let type = req.params.type
	  
    const subtitles = await subtitlePageFinder(videoId, type, season, episode, agentConfig);
    respond(res, { subtitles: subtitles, cacheMaxAge: CACHE_MAX_AGE, staleRevalidate: STALE_REVALIDATE_AGE, staleError: STALE_ERROR_AGE});
    
	} catch (err) {
    console.log(err);
    respond(res, { "subtitles" : [] });
	}
})

addon.get('/addon-status', async function (req, res) {
  try {
    let proxyStatus, websiteStatus

    const responseProxy = await axios.get("https://api.ipify.org/?format=json");
    const responseWebsite = await axios.get("https://api-prod.downfor.cloud/httpcheck/https://turkcealtyazi.org")

    if(responseProxy.data.ip = axios.defaults.httpsAgent.proxy.hostname){
      proxyStatus = "OK!"
    } else {
      proxyStatus = "FAIL!"
    }

    if(responseWebsite.data.isDown === false) {
      websiteStatus = "OK!"
    }else if (responseWebsite.data.isDown === true){
      websiteStatus = "DOWN!"
    }

    return res.send(`Proxy Status: ${proxyStatus} - Website Status: ${websiteStatus}`)
    
  } catch (err) {
    console.log(err)
    return res.send("Error ocurred.")
  }
});


if (module.parent) {
  module.exports = addon;
} else {
  addon.listen(config.port, function () {
    console.log(config)
  });
}