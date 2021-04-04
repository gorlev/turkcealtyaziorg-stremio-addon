const mainPageFinder = require("./mainPageFinder");
const cheerio = require('cheerio');
const { default: axios } = require("axios");
const subIDfinder = require("./subIDfinder");
const config = require('../config');

//SCRAPES AND FINDS THE SUBTITLES FOR THE GIVEN PARAMETERS ON SUBTITLES LISTING PAGE. 
module.exports = async function subtitlePageFinder(imdbId,type, season, episode,) {
    
    try {
        let subtitlesData = [];

        //GOES TO THE MAIN PAGE FOR THE MOVIE/SERIES.
        const mainPageURL  = await mainPageFinder(imdbId)
        console.log(mainPageURL)

        const mainPageHTML = await axios.get(mainPageURL)

        $ = cheerio.load(mainPageHTML.data)

        //SCRAPES SUBTITLE PAGE LINK, SUBTITLE LANGUAGE AND CD NUMBER FOR MOVIES. 
        //IT DOESN'T SCRAPE IF CD NUMBER MORE THAN 1. 
        //IT DOESN'T SCRAPE IF THE SUBTITLE IS NOT TURKISH.
        if (type === "movie") {
            $('.altyazi-list-wrapper  > div > div').each((i, section) => {
                let subPageURL = $(section).children('.alisim').children('.fl').children('a').attr('href');
                let subLang = $(section).children('.aldil').children('span').attr('class')
                let cd = Number($(section).children('.alcd').text().trim())
                
                if (subLang === "flagtr" && subPageURL !== undefined && cd === 1) {
                    
                    subPageURL = "https://turkcealtyazi.org" + subPageURL
                    subLang = subLang.substring(4)
                    subtitlesData.push({ lang:subLang , pageUrl: subPageURL})
                }
            }).get()
        

        //SCRAPES SUBTITLE PAGE URL, SUBTITLE LANGUAGE, SEASON AND EPISODE NUMBER. IT LISTS ALSO SUBTITLE PACKS IF THE SEASON NUMBER MATCHS.
        } else {
            $('.altyazi-list-wrapper  > div > div').each((i, section) => {
                let subPageURL = $(section).children('.alisim').children('.fl').children('a').attr('href');
                let subLang = $(section).children('.aldil').children('span').attr('class');
                let seasonNumber = $(section).children('.alcd').children('b').first().text().trim();
                let episodeNumber = $(section).children('.alcd').children('b').last().text().trim();

                if(seasonNumber.indexOf("0") === 0){
                    seasonNumber = seasonNumber.substring(1)
                }
                
                if(episodeNumber.indexOf("0") === 0){
                    episodeNumber = (episodeNumber.substring(1))
                }

                seasonNumber = Number(seasonNumber);

                if (episodeNumber === "Paket" || episodeNumber === "paket"){
                    episodeNumber = "Paket";
                } else {
                    episodeNumber = Number(episodeNumber);
                }

                if (subLang === "flagtr" && subPageURL !== undefined && season === seasonNumber) {
                    
                    if (episode === episodeNumber || episodeNumber === "Paket"){
                        subPageURL = "https://turkcealtyazi.org" + subPageURL
                        subLang = subLang.substring(4)
                        subtitlesData.push({ lang:subLang , pageUrl: subPageURL, season: seasonNumber, episode: episodeNumber})
                    }
                }


            }).get()
        }

        
        console.log(subtitlesData.length, "subtitles found")
        console.log(subtitlesData)

        //CREATES DOWNLOAD LINK FOR THE POST REQUEST.
        let stremioElements = []
        
        for (let i= 0; i <subtitlesData.length; i++) {
            let subIDs = await subIDfinder(subtitlesData[i].pageUrl)
            
            let idid = subIDs[0].idid
            let altid = subIDs[0].altid

            let lang = "tur"
            let url = `http://127.0.0.1:11470/subtitles.vtt?from=${config.local}/download/${idid}-${altid}.zip`

            stremioElements.push({  url: url, 
                                    lang: lang, 
                                    id: altid,
                                })
        }

        console.log(stremioElements)

        return stremioElements;

    } catch (e) {
        console.error("Error happened on subtitlePageFinder",e);
    }

}