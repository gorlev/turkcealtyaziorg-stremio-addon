
const axios = require('axios').default;
const cheerio = require('cheerio');

async function isItDownForMe() {

    try {
        const data = `wp-isitdownorjustme-form-url=turkcealtyazi.org&wp-isitdownorjustme-form-submit=`
        const responseDown = await axios({url:"https://isitdownorjustme.net/",method:"POST", data, headers:{"user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36"}});
        $ = cheerio.load(responseDown.data)

        let array = []

        $('.wp-isitdownorjustme-table > tbody > tr').each((i, section) => {
            let title = $(section).children("th").text()
            let response = $(section).children("td").text()
            array.push({[title]:response})    
        }).get()    

        let result = {
            title: array[0]["Title"],
            description: array[1]["Description"],
            status: array[2]["Status"],
            responseTime: array[3]["Response Time"],
        }

        return {status:1, result}
    } catch (error) {
        console.log(error)
        return {status:0, result:error}
    }
}

module.exports = isItDownForMe