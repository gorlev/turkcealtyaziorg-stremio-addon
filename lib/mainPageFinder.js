const axios = require('axios');
//FINDS THE LISTING OF SUBTITLES PAGE FROM IMDBID
module.exports = async function mainPageFinder(imdbId, httpsAgent) {
    try {
        const editedId = imdbId.substring(2)
        const response = await axios({url:`https://turkcealtyazi.org/things_.php?t=99&term=${editedId}`, method:"GET", httpsAgent})

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
