const express = require("express");
const landing = require('./landingTemplate');
const addon = express();
const axios = require('axios')
const subtitlePageFinder = require("./lib/subtitlePageFinder");
const config = require('./config');


var respond = function (res, data) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');
  res.send(data);
};

var MANIFEST = {
  id: "org.community.turkcealtyaziorg",
  version: "1.0.0",
  name: "TurkceAltyazi.Org",
  logo: "https://turkcealtyazi.org/images/apple/ilogo144.png",
  description: "TurkceAltyazi.org Stremio Addon unofficially brings all Turkish subtitles from TurkceAltyazi.org to Stremio.",
  types: ["movie", "series"],
  resources: [
    "subtitles"
  ],
  catalogs: [],
  idPrefixes: ["tt"]
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
    const response = await axios({url: 'https://turkcealtyazi.org/ind', method: "POST", headers: {Accept: 'application/zip'}, data:`idid=${req.params.idid}&altid=${req.params.altid}`, responseEncoding: "null", responseType: 'arraybuffer'});

    return res.send(response.data)

    } catch (err) {
        return res.send(err)
    }
});


addon.get('/subtitles/:type/:imdbId/:query.json', async (req, res) => {
	try {
    console.log(req.params.type, req.params.imdbId)

    let videoId =  req.params.imdbId.split(":")[0]
    let season = Number(req.params.imdbId.split(":")[1])
    let episode = Number(req.params.imdbId.split(":")[2])
    let type = req.params.type
    
	  const subtitles = await subtitlePageFinder(videoId, type, season, episode );
	  
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
    console.log(`Add-on Repository URL: ${config.local}/manifest.json`)
  });
}