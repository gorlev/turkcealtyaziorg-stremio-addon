require('dotenv').config();
const express = require("express");
const landing = require('./landingTemplate');
const addon = express();
const axios = require('axios')
const subtitlePageFinder = require("./lib/subtitlePageFinder");
const config = require('./config');
const MANIFEST = require('./manifest');

// const HttpsProxyAgent = require("https-proxy-agent");
// const proxyAgent = new HttpsProxyAgent({host: process.env.PROXY.split(":")[0], port: process.env.PROXY.split(":")[1], auth:`${process.env.PROXY.split(":")[2]}:${process.env.PROXY.split(":")[3]}`})

var SocksProxyAgent = require('socks-proxy-agent');
const proxyAgent = new SocksProxyAgent({host: process.env.PROXY.split(":")[0], port: process.env.PROXY.split(":")[1], auth:`${process.env.PROXY.split(":")[2]}:${process.env.PROXY.split(":")[3]}`})

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
    const response = await axios({url: 'https://turkcealtyazi.org/ind', method: "POST", headers: {"Accept": 'application/zip', "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36", "content-type":"application/x-www-form-urlencoded"}, data:`idid=${req.params.idid}&altid=${req.params.altid}`, responseEncoding: "null", responseType: 'arraybuffer', proxyAgent});
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
	  const subtitles = await subtitlePageFinder(videoId, type, season, episode, proxyAgent);
	  
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