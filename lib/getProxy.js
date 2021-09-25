require('dotenv').config({path: '../.env'});
const axios = require('axios')
const { HttpProxyAgent, HttpsProxyAgent } = require("hpagent");
const proxy = process.env.PROXY_LINK;

function getProxy() {
    const agentConfig = {
        proxy: proxy,
        keepAlive: true,
        keepAliveMsecs: 2000,
        maxSockets: 256,
        maxFreeSockets: 256,
    };
    axios.defaults.httpAgent = new HttpProxyAgent(agentConfig);
    axios.defaults.httpsAgent = new HttpsProxyAgent(agentConfig);

    return axios.defaults.httpsAgent.proxy.host;
};

module.exports = getProxy