module.exports = {
  id: 'org.community.turkcealtyaziorg',
  version: '2.0.0',
  name: 'TurkceAltyazi.Org',
  description: "TurkceAltyazi.org'daki Türkçe film ve dizi altyazılarını Stremio'ya getirir.",
  types: ['movie', 'series'],
  resources: [
    {
      name: 'subtitles',
      types: ['movie', 'series'],
      idPrefixes: ['tt'],
    },
  ],
  catalogs: [],
  idPrefixes: ['tt'],
  behaviorHints: {
    configurable: false,
    configurationRequired: false,
  },
};
