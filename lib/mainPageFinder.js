const axios = require('axios');

const { HttpProxyAgent, HttpsProxyAgent } = require("hpagent");

//FINDS THE LISTING OF SUBTITLES PAGE FROM IMDBID
module.exports = async function mainPageFinder(imdbId, agentConfig) {
    try {
        axios.defaults.httpAgent = new HttpProxyAgent(agentConfig);
        axios.defaults.httpsAgent = new HttpsProxyAgent(agentConfig);
        
        const editedId = imdbId.substring(2)
        const response = await axios({url:`https://turkcealtyazi.org/things_.php?t=99&term=${editedId}`, method:"GET"})

        if (response.status === 200){
            const mainPageURL = "https://turkcealtyazi.org" + response.data[0].url
            return mainPageURL
        } else {
            return mainPageURL = ""
        }

    } catch (e) {
        console.log("Subtitle page couldn't find on turkcealtyazi.org",e)
    }
}
