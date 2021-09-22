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

let agentConfig = {
  proxy: proxy,
  keepAlive: true,
  keepAliveMsecs: 2000,
  maxSockets: 256,
  maxFreeSockets: 256,
};
// axios.defaults.httpAgent = new HttpProxyAgent(agentConfig);
// axios.defaults.httpsAgent = new HttpsProxyAgent(agentConfig);

// var HttpsProxyAgent = require("https-proxy-agent");
// const proxyAgent = new HttpsProxyAgent({host: process.env.PROXY.split(":")[0], port: process.env.PROXY.split(":")[1], auth:`${process.env.PROXY.split(":")[2]}:${process.env.PROXY.split(":")[3]}`})
// const proxyAgent = new HttpsProxyAgent(process.env.PROXY_LINK)

// var SocksProxyAgent = require('socks-proxy-agent');
// const proxyAgent = new SocksProxyAgent({host: process.env.PROXY.split(":")[0].trim(), port: process.env.PROXY.split(":")[1].trim(), auth:`${process.env.PROXY.split(":")[2].trim()}:${process.env.PROXY.split(":")[3].trim()}`})

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

addon.get('/myip', async function (req, res) {
  try {
    axios.defaults.httpAgent = new HttpProxyAgent(agentConfig);
    axios.defaults.httpsAgent = new HttpsProxyAgent(agentConfig);
  
    let ipres = await axios({url:"https://api.ipify.org/?format=json", method: "GET"});
    return res.send(ipres.data.ip)

  } catch (err) {
    return res.send(err)
  }
});
addon.get('/download/:idid\-:altid.zip', async function (req, res) {
  try {
    axios.defaults.httpAgent = new HttpProxyAgent(agentConfig);
    axios.defaults.httpsAgent = new HttpsProxyAgent(agentConfig);
    const response = await axios({url: 'https://turkcealtyazi.org/ind', method: "POST", headers: {"Accept": 'application/zip'}, data:`idid=${req.params.idid}&altid=${req.params.altid}`, responseEncoding: "null", responseType: 'arraybuffer'});
    return res.send(response.data)

  } catch (err) {
    return res.send(err)
  }
});

addon.get('/subtitles/:type/:imdbId/:query.json', async (req, res) => {
	try {

    let videoId =  req.params.imdbId.split(":")[0]
    let season = Number(req.params.imdbId.split(":")[1])
    let episode = Number(req.params.imdbId.split(":")[2])
    let type = req.params.type
	  const subtitles = await subtitlePageFinder(videoId, type, season, episode, agentConfig);
	  
    respond(res, { "subtitles" : subtitles});

	} catch (err) {
		console.log("Subtitle request error.");
		console.log(err);
	}
})

if (module.parent) {
  module.exports = addon;
} else {
  addon.listen( config.port, function () {
    console.log(config)
  });
}