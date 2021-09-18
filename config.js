var env = process.env.NODE_ENV ? 'beamup':'local';

var config = {

    turkceAltyaziURL: 'turkcealtyazi.org',
    proxy: process.env.PROXY.split(":")[0] + ":" + process.env.PROXY.split(":")[1]

}

switch (env) {
    //Public server build.
    case 'beamup':
		config.port = process.env.PORT
        config.local = "https://5a0d1888fa64-turkcealtyaziorg.baby-beamup.club"
        break;

    //Local sever build.
    case 'local':
		config.port = 3648
        config.local = "http://127.0.0.1:" + config.port;
        break;
}

module.exports = config;