require('dotenv').config({path: '../.env'});
const axios = require('axios')
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

function getProxy() {


    if(axios && axios.defaults && axios.defaults.httpsAgent && axios.defaults.httpsAgent.proxy && axios.defaults.httpsAgent.proxy.host){
        // console.log(axios.defaults.httpsAgent.proxy)
        return axios.defaults.httpsAgent.proxy.host;
    }else{
        return "Proxy is not available!"
    }
};

module.exports = getProxy