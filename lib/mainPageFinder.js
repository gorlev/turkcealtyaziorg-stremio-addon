const axios = require('axios').default;

const { HttpProxyAgent, HttpsProxyAgent } = require("hpagent");

//FINDS THE LISTING OF SUBTITLES PAGE FROM IMDBID
module.exports = async function mainPageFinder(imdbId, agentConfig) {
    try {
        axios.defaults.httpAgent = new HttpProxyAgent(agentConfig);
        axios.defaults.httpsAgent = new HttpsProxyAgent(agentConfig);
        
        const editedId = imdbId.substring(2)
        const response = await axios({url:`https://turkcealtyazi.org/things_.php?t=99&term=${editedId}`, method:"GET", headers:{"user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36"}})

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