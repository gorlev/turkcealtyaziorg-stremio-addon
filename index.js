require('dotenv').config({path: './.env'});
const express = require("express");
const landing = require('./landingTemplate');
const app = express();
const axios = require('axios')
// const subtitlePageFinder = require("./lib/subtitlePageFinder");
const subtitlePageFinder = require("./scraper");
const config = require('./config');
const MANIFEST = require('./manifest');
const { HttpProxyAgent, HttpsProxyAgent } = require("hpagent");
const proxy = process.env.PROXY_LINK;
const NodeCache = require( "node-cache" );
const isItDownForMe = require('./addonStatus');
const rateLimit = require('express-rate-limit')

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 30, // Limit each IP to 30 requests per `window` (here, per 15 minutes)
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})
const myCache = new NodeCache({ stdTTL: 15*60, checkperiod: 120 });

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

app.get('/', function (req, res) {
  res.set('Content-Type', 'text/html');
	res.send(landing(MANIFEST));
});

app.get("/:userConf?/configure", function (req, res) {
  if(req.params.userConf !== "addon"){
    res.redirect("/addon/configure")
  }else{
    res.set('Content-Type', 'text/html');
    const newManifest = { ...MANIFEST };
    res.send(landing(newManifest));
  }
});

app.get('/manifest.json',function (req, res) {
  const newManifest = { ...MANIFEST };
  // newManifest.behaviorHints.configurationRequired = false;
  newManifest.behaviorHints.configurationRequired = true;
  respond(res, newManifest);
});

app.get('/:userConf/manifest.json', function (req, res) {
  const newManifest = { ...MANIFEST };
  if (!((req || {}).params || {}).userConf) {
    newManifest.behaviorHints.configurationRequired = true;
    respond(res, newManifest);
  } else {
    newManifest.behaviorHints.configurationRequired = false;
    respond(res, newManifest);
  }
});

app.get('/download/:idid\-:altid.zip', limiter, async function (req, res) {
  try {
    res.set('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, stale-while-revalidate:${STALE_REVALIDATE_AGE}, stale-if-error:${STALE_ERROR_AGE}`);
    
    const response = await axios({url: 'https://turkcealtyazi.org/ind', method: "POST", headers: {"Accept": 'application/zip', "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36"}, data:`idid=${req.params.idid}&altid=${req.params.altid}`, responseEncoding: "null", responseType: 'arraybuffer'});
    return res.send(response.data)
    
  } catch (err) {
    console.log(err)
    return res.send("Couldn't get the subtitle.")
  }
});

app.get('/:userConf?/subtitles/:type/:imdbId/:query?.json',limiter, async function (req, res) {
  try {
    let {type,imdbId,query} = req.params
    let videoId =  imdbId.split(":")[0]
    let season = Number(imdbId.split(":")[1])
    let episode = Number(imdbId.split(":")[2])
	    
    if (myCache.has(req.params.imdbId)) {
      respond(res, myCache.get(req.params.imdbId)); 
    } else {
      const subtitles = await subtitlePageFinder(videoId, type, season, episode);
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

app.get('/cache-status/:devpass?/:query?/:key?', function (req, res) {
  let {devpass,query,key} = req.params
  const devKey = process.env.DEV_KEY;
  try {
    if(devKey == devpass){
      if(query == "keys"){
        res.send(myCache.keys())
      }else if(query == "flushAll"){
        res.send(myCache.flushAll())
      }else if(query == "flushStats"){
        res.send(myCache.flushStats())
      }else if(query == "get"){
        if(key){
          res.send(myCache.get(key))
        }else{
          res.send("You forgot to send the key!")
        }
      }else if(query == "getStats"){
        res.send(myCache.getStats())
      }else{
        res.send("Missing or wrong parameter.")
      }
    }else{
      return res.send("You shouldn't be here.")
    }
  } catch (err) {
    console.log(err)
    return res.send("Error ocurred.")
  }
});

app.get('/app-status/:devpass?', async function (req, res) {
  let {devpass} = req.params
  const devKey = process.env.DEV_KEY;
  if(devpass == devKey){
    let proxyStatus,websiteStatus
    try {
      const responseProxy = await axios.get("https://api.myip.com/");
      if(responseProxy.data.cc.trim()==="TR"){
        proxyStatus = "OK!"
      }else{
        proxyStatus = "FAIL!"
      }
    } catch (error) {
      proxyStatus = "SERVER DOWN!"
    }
    
    try {
      websiteStatus = await isItDownForMe()
      if(websiteStatus.status == 1 && websiteStatus.result.status == "Site Online"){
        websiteStatus = "OK!"
      }else{
        websiteStatus = "FAIL!"
      }
    } catch (error) {
      websiteStatus = "WEBSITE DOWN!"
    }
    return res.send(`Proxy Status: ${proxyStatus}\nWebsite Status: ${websiteStatus} `)
  }else{
    return res.send("You shouldn't be here.")
  }  
});

app.get('*', function(req, res){
  res.redirect("/")
});

if (module.parent) {
  module.exports = app;
} else {
  app.listen(config.port, function () {
    console.log(config)
  });
}