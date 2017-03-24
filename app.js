const path = require('path');

const ImageManager = require("./managers/ImageManager");
const ConfigurationManager = require("./managers/ConfigurationManager");

const appRoot = path.resolve(__dirname);

const confiigurationManager = new ConfigurationManager(appRoot, "config.json");

confiigurationManager.configure()
.then((config) => {
	const imageManager = new ImageManager(config.flickrApiKey, config.flickrApiSecret);
	imageManager.getPhotos();
})
.catch((err) => {
	console.log(err);
});
