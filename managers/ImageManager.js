const os = require("os");
const fs = require("fs");
const url = require("url");

const RedditImageManager = require("./RedditImageManager");
const FlickrImageManager = require("./FlickrImageManager");

class ImageManager {
  constructor(flickrApiKey, flickrApiSecret, flickrImageCount=100){
    this.clearPhotos();
    this.redditImageManager = new RedditImageManager();
    this.flickrImageManager = new FlickrImageManager(flickrApiKey, flickrApiSecret, flickrImageCount);
    this.photos = [];
    this.totalPics = 0;
    this.picsComplete = 0;
    this.imageTimeout = null;
  }

  getPhotos(){
    let redditImages = this.redditImageManager.getRedditPics();
    let flickrImages = this.flickrImageManager.getFlickrPics();

    Promise.all([redditImages, flickrImages])
    .then((results) => {
      this.photos = [...results[0], ...results[1]];
      this.totalPics = this.photos.length;
      try{
        this.savePhotos();
      }
      catch(e){
        console.error(e);
      }
    })
    .catch((err) => {
      console.log(err);
    });
  }

  savePhotos() {
  	this.photos.forEach((photo) => {
  		try {
  			this.savePhoto(photo.url, photo.filename, photo.secure);
  		}
  		catch (e) {
  			this.totalPics--;
        console.log(e);
  		}
  	});
  }

  savePhoto(imageUrl, filename, secure) {
  	const savePath = `${os.homedir()}\\Pictures\\lockscreen\\${filename}`;
    const lib = secure ? require('https') : require('http');

  	this.forceCloseTimer();
		lib.get(imageUrl, (response) => {
			if (response.statusCode === 200 && savePath.indexOf("?") === -1) {
				try {
					response
						.pipe(fs.createWriteStream(savePath))
						.on("finish", () => {
							this.picsComplete++;
							console.log(`Complete: ${this.picsComplete} / ${this.totalPics}`);
							this.checkComplete();
							this.forceCloseTimer();
						});
				}
				catch (e) {
					// Ignore
					this.totalPics--;
					this.checkComplete();
					this.forceCloseTimer();
				}
			}
			else {
				//console.log("File doesn't exist");
				this.totalPics--;
				this.checkComplete();
				this.forceCloseTimer();
			}
			this.checkComplete();
		})
		.on("error", (err) => {
			this.totalPics--;
			this.checkComplete();
			this.forceCloseTimer();
		});
  }

  checkComplete() {
  	if (this.picsComplete === this.totalPics) {
  		process.exit();
  	}
  }

  forceCloseTimer() {
  	if (typeof this.imageTimeout !== "undefined") clearTimeout(this.imageTimeout);
  	this.imageTimeout = setTimeout(() => {
  		console.log("Exiting");
  		process.exit();
  	},
  	60 * 1000);
  }

  clearPhotos() {
  	const photoDir = `${os.homedir()}\\Pictures\\lockscreen`;
  	const fileList = fs.readdirSync(photoDir);
  	fileList.forEach((file) => {
  		let filePath = `${photoDir}\\${file}`;
  		fs.unlink(filePath);
  	});
  	this.photos = [];
  }

}

module.exports = ImageManager;
