const STYLESHEET = `
* {
   box-sizing: border-box;
}
body,
html {
   margin: 0px;
   padding: 0px;
   font-family: OpenSans, arial, sans-serif;
   font-weight: 300;
   color: white;
   width: 100%;
   height: 100%
}

html {
   background-size: auto 100%;
   background-size: cover;
   background-position: center center;
   background-repeat: no-repeat
}

body {
   background: rgba(0, 0, 0, 0.65)
}

h1, h2, h3 {
   font-weight: 300
}

#addon {
   width: 400px;
   position: absolute;
   left: 0px;
   right: 0px;
   top: 10%;
   bottom: auto;
   margin: auto
}

a {
   color: white
}

a.install-link {
   text-decoration: none
}

button {
   border: 0px;
   outline: 0px;
   color: white;
   background: rgba(125, 79, 158, 0.85);
   padding: 13px 22px;
   text-align: center;
   font-size: 17px;
   font-weight: 300;
   cursor: pointer;
   opacity: 0.9;
   display: block
}

button:hover {
   opacity: 1
}

.logo {
   max-width: 300px;
   float: left;
   margin: 20px
}

.name {
   float: left
}

.version {
   float: right
}

.provides,
.gives,
.description {
   clear: both
}

.best {
   margin-bottom: 30px
}

.best img {
   width: 60px
}
`

function landingTemplate(manifest) {
	const background = manifest.background || 'https://dl.strem.io/addon-background.jpg'
	const logo = manifest.logo || 'https://dl.strem.io/addon-logo.png'
	const contactHTML = manifest.contactEmail ?
		`<div class="contact">
         <p>Contact ${manifest.name} creator:</p>
         <a href="mailto:${manifest.contactEmail}">${manifest.contactEmail}</a>
      </div>` : ''

	const stylizedTypes = manifest.types
		.map(t => t[0].toUpperCase() + t.slice(1) + (t !== 'series' ? 's' : ''))

	return `
   <!DOCTYPE html>
   <html style="background-image: url(${background});">
   <head>
      <meta charset="utf-8">
      <title>${manifest.name} - Stremio Addon</title>
      <style>${STYLESHEET}</style>
      <link rel="shortcut icon" href="${logo}" type="image/x-icon">
      <link href="https://fonts.googleapis.com/css?family=Open+Sans:400,600,700&display=swap" rel="stylesheet">
   </head>
	<body>
      <div id="addon">
         <div class="logo">
            <img src="${logo}">
         </div>
         <h1 class="name">${manifest.name}</h1>
         <h2 class="version">${manifest.version || '0.0.0'}</h2>
         <h2 class="description">${manifest.description || ''}</h2>
         <div class="separator"></div>
         <h3 class="gives">This addon has more :</h3>
         <ul>
            ${stylizedTypes.map(t => `<li>${t}</li>`).join('')}
         </ul>
         <div class="separator"></div>
         <a id="installLink" class="install-link" href="#">
            <button name="Install">INSTALL</button>
         </a>
         ${contactHTML}
      </div>
      <script>
         installLink.href = 'stremio://' + window.location.host + '/manifest.json'
      </script>
	</body>
	</html>`
}

module.exports = landingTemplate