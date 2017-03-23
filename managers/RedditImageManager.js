const https = require("https");
const http = require("http");
const url = require("url");

class RedditImageManager {

  constructor(){
    this.photos = [];
    this.photoCount = 0;
    this.sourceCount = 0;
    this.picsComplete = 0;
    this.totalPics = 0;
    this.imageTimeout;
    this.photosCopy = [];

    // Subreddits containing cool images
    this.redditUrls = [
    	"https://www.reddit.com/r/EarthPorn/new.json?sort=new",
    	"https://www.reddit.com/r/Breathless/new.json?sort=new",
    	"https://www.reddit.com/r/AmateurEarthPorn/new.json?sort=new",
    	"https://www.reddit.com/r/BackgroundArt/new.json?sort=new",
    	"https://www.reddit.com/r/EyeCandy/new.json?sort=new",
    	"https://www.reddit.com/r/itookapicture/new.json?sort=new",
    	"https://www.reddit.com/r/JunglePorn/new.json?sort=new",
    	"https://www.reddit.com/r/nature/new.json?sort=new",
    	"https://www.reddit.com/r/naturepics/new.json?sort=new",
    	"https://www.reddit.com/r/natureporn/new.json?sort=new",
    	"https://www.reddit.com/r/curiousplaces/new.json?sort=new",
    	"https://www.reddit.com/r/AbandonedPorn/new.json?sort=new",
    	"https://www.reddit.com/r/SkyPorn/new.json?sort=new",
    	"https://www.reddit.com/r/astrophotography/new.json?sort=new",
    	"https://www.reddit.com/r/spaceporn/new.json?sort=new",
    	"https://www.reddit.com/r/CityPorn/new.json?sort=new",
    	"https://www.reddit.com/r/wallpaper/new.json?sort=new",
    	"https://www.reddit.com/r/AerialPorn/new.json?sort=new",
    	"https://www.reddit.com/r/HellscapePorn/new.json?sort=new",
    	"https://www.reddit.com/r/FractalPorn/new.json?sort=new",
    	"https://www.reddit.com/r/ArchitecturePorn/new.json?sort=new",
    	"https://www.reddit.com/r/MicroPorn/new.json?sort=new",
    	"https://www.reddit.com/r/pic/new.json?sort=new",
    	"https://www.reddit.com/r/photographs/new.json?sort=new",
    	"https://www.reddit.com/r/WQHD_Wallpaper/new.json?sort=new"
    ];
  }

  getRedditPics() {
    let posts = this.getPosts();
    return new Promise((resolve, reject) => {
      try {
        posts.then((results) => {
          results.forEach((result) => {
            this.processRedditPosts(result.data.children);
          });
          resolve(this.photos);
        }, (err) => {
          console.error(err);
          reject([]);
        });
      }
      catch(e){
        reject("Error getting posts");
      }
    });

  }

  getPosts(){
    let promises = this.redditUrls.map((redditUrl) => this.getPostData(redditUrl));
    return Promise.all(promises);
  }

  getPostData(redditUrl){
    return new Promise((resolve, reject) => {
      const request = https.get(redditUrl, (response) => {
        // handle http errors
        if (response.statusCode < 200 || response.statusCode > 299) {
           reject(new Error('Failed to load page, status code: ' + response.statusCode));
        }
        // temporary data holder
        const body = [];
        // on every content chunk, push it to the data array
        response.on('data', (chunk) => body.push(chunk));
        // we are done, resolve promise with those joined chunks
        response.on('end', () => resolve(JSON.parse(body.join(''))));
      });
      // handle connection errors of the request
      request.on('error', (err) => reject("Reddit not available"));
    });
  }

  processRedditPosts(postList) {
  	this.sourceCount++;
  	postList.forEach((post) => {
  		let imageUrl = post.data.url;
  		const isImgur = this.isValidImgur(imageUrl);
  		if (isImgur) imageUrl = this.getImgurUrl(imageUrl);
  		const pathSplit = imageUrl.split("/");
  		const filename = pathSplit[pathSplit.length - 1];
  		const fileType = filename.split(".");
  		const fileExtension = fileType[fileType.length - 1].toLowerCase();

  		if (fileType[fileType.length - 1] === "jpg" || isImgur) {
  			let secure = pathSplit[0].toLowerCase() === "https:";
  			this.photos.push({
  				"url": imageUrl,
  				"filename": filename,
  				"secure": secure
  			});
  		}
  	});
  	//if (this.sourceCount === redditUrls.length) savePhotos();
  }

  getImgurUrl(imageUrl) {
  	let finalUrl = imageUrl;
  	let pathInfo = "";
  	let urlData = url.parse(imageUrl);
  	if (urlData.hostname.toLowerCase() === "i.imgur.com") {
  		finalUrl = `${urlData.protocol}//${urlData.hostname}${urlData.pathname}`;
  	}
  	else if (urlData.hostname.toLowerCase() === "imgur.com") {
  		finalUrl = `${urlData.protocol}//i.imgur.com${urlData.pathname}.jpg`;
  	}
  	return finalUrl;
  }

  isValidImgur(imageUrl) {
  	return imageUrl.toLowerCase().indexOf("imgur.com") > -1 && imageUrl.toLowerCase().indexOf("/gallery") === -1;
  }

}

module.exports = RedditImageManager;
