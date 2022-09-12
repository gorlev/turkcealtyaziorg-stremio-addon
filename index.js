require('dotenv').config({path: './.env'});
const express = require("express");
const landing = require('./landingTemplate');
const addon = express();
const axios = require('axios')
// const subtitlePageFinder = require("./lib/subtitlePageFinder");
const subtitlePageFinder = require("./scraper");
const config = require('./config');
const MANIFEST = require('./manifest');
const { HttpProxyAgent, HttpsProxyAgent } = require("hpagent");
const proxy = process.env.PROXY_LINK;
const NodeCache = require( "node-cache" );

const myCache = new NodeCache();

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
    
    const response = await axios({url: 'https://turkcealtyazi.org/ind', method: "POST", headers: {"Accept": 'application/zip', "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36"}, data:`idid=${req.params.idid}&altid=${req.params.altid}`, responseEncoding: "null", responseType: 'arraybuffer'});
    return res.send(response.data)
    
  } catch (err) {
    console.log(err)
    return res.send("Couldn't get the subtitle.")
  }
});

addon.get('/subtitles/:type/:imdbId/:query?.json', async (req, res) => {
  try {
    let videoId =  req.params.imdbId.split(":")[0]
    let season = Number(req.params.imdbId.split(":")[1])
    let episode = Number(req.params.imdbId.split(":")[2])
    let type = req.params.type
	    
    if (myCache.has(req.params.imdbId)) {
      respond(res, myCache.get(req.params.imdbId)); 
    } else {
      const subtitles = await subtitlePageFinder(videoId, type, season, episode, agentConfig);
      console.log(subtitles)
      if (subtitles.length > 0){
        myCache.set(req.params.imdbId, { subtitles: subtitles, cacheMaxAge: CACHE_MAX_AGE, staleRevalidate: STALE_REVALIDATE_AGE, staleError: STALE_ERROR_AGE}, 15*60) // 15 mins
        respond(res, { subtitles: subtitles, cacheMaxAge: CACHE_MAX_AGE, staleRevalidate: STALE_REVALIDATE_AGE, staleError: STALE_ERROR_AGE});
      } else {
        myCache.set(req.params.imdbId, {subtitles: subtitles}, 2*60) // 2 mins
        respond(res, { subtitles: subtitles});
      }
    }

	} catch (err) {
    console.log(err);
    respond(res, { "subtitles" : [] });
	}
})

addon.get('/cache-status', function (req, res) {
  try {
    return res.send(myCache.getStats())
  } catch (err) {
    console.log(err)
    return res.send("Error ocurred.")
  }
});

addon.get('/addon-status', async function (req, res) {
  
    let proxyStatus
    try {
      const responseProxy = await axios.get("https://api.myip.com/");
      if(responseProxy.data.cc.trim()==="TR"){
        proxyStatus = "OK!"
      }else{
        proxyStatus = "FAIL!"
      }
    } catch (error) {
      proxyStatus = "FAIL!"
      res.send("Could not connect to https://api.myip.com/")
    }
    return res.send(`Proxy Status: ${proxyStatus}`)    
});

addon.get('*', function(req, res){
  res.redirect("/")
});


if (module.parent) {
  module.exports = addon;
} else {
  addon.listen(config.port, function () {
    console.log(config)
  });
}