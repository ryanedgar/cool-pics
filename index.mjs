import ImageManager from './managers/ImageManager.mjs';
import ConfigurationManager from './managers/ConfigurationManager.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// const path = require('path');

// const ImageManager = require("./managers/ImageManager");
// const ConfigurationManager = require('./managers/ConfigurationManager');

const appRoot = path.resolve(__dirname);

const configurationManager = new ConfigurationManager(appRoot, 'config.json');

configurationManager
    .configure()
    .then((config) => {
        const imageManager = new ImageManager(config.flickrApiKey, config.flickrApiSecret);
        imageManager.getPhotos();
    })
    .catch((err) => {
        console.log(err);
    });
