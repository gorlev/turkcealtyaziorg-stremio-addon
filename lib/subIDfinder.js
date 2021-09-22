const axios = require('axios');
const cheerio = require('cheerio');

const { HttpProxyAgent, HttpsProxyAgent } = require("hpagent");

//FINDS THE IDID AND ALTID PARAMETERS FOR THE POST REQUEST FOR DOWNLOADING ZIP FILE
module.exports = async function subIDfinder(subLink, agentConfig) {
    try {

        axios.defaults.httpAgent = new HttpProxyAgent(agentConfig);
        axios.defaults.httpsAgent = new HttpsProxyAgent(agentConfig);

        const response = await axios({url:subLink, method:"GET"});

        $ = cheerio.load(response.data)
        let subIDs = []

        $('form[action="/ind"] > div').each((i, section) => {
            let idid = $(section).children('input[name="idid"]').attr('value')
            let altid = $(section).children('input[name="altid"]').attr('value')
            subIDs.push({idid: idid, altid: altid})    
        }).get()    

        return subIDs

    } catch (e) {
        console.log("Sub IDs could not found!",e)
    }
}
