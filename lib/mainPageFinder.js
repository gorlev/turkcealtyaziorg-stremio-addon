const axios = require('axios');

//FINDS THE LISTING OF SUBTITLES PAGE FROM IMDBID
module.exports = async function mainPageFinder(imdbId) {
    try {
        const editedId = imdbId.substring(2)
        const response = await axios.get(`https://turkcealtyazi.org/things_.php?t=99&term=${editedId}`)
        const mainPageURL = "https://turkcealtyazi.org" + response.data[0].url
   
        return mainPageURL

    } catch (e) {
        console.log("Subtitle page couldn't find on turkcealtyazi.org",e)
    }
}
