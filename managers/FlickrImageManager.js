const Flickr = require("flickrapi");

class FlickrImageManager {

  constructor(apiKey, secret, imageCount=100){
    this.photos = [];
    this.photoCount = 0;
    this.picsComplete = 0;
    this.apiKey = apiKey;
    this.secret = secret;
  }

  getFlickrPics(){
    let flickrOptions = {
    		api_key: this.apiKey,
    		secret: this.secret
    };
    let self = this;
    const searchDate = new Date();
    console.log(`Running update on ${searchDate}`);
    searchDate.setDate(searchDate.getDate() - 2);
    const yearString = this.padNumber(searchDate.getFullYear(), 0);
    const monthString = this.padNumber(searchDate.getMonth() + 1, 2);
    const dayString = this.padNumber(searchDate.getDate(), 2);
    const yesterday = `${yearString}-${monthString}-${dayString}`;


    return new Promise((resolve, reject) => {

      Flickr.tokenOnly(flickrOptions, (error, flickr) => {

      	flickr.interestingness.getList(
      		{
      			date: yesterday,
      			page: 1,
      			per_page: 100
      		},
      		function (err, result) {
      			if (err) {
      				console.error(err);
              reject([]);
      			}
      			else {
      				//this.photoCount = result.photos.photo.length;
              console.log("Got Flickr pics");
      				for (let i = 0; i < result.photos.photo.length; i++) {
      					let  filename = self.getFilename(result.photos.photo[i].id, result.photos.photo[i].secret),
      						   imageUrl = self.getFlickrUrl(result.photos.photo[i].farm, result.photos.photo[i].server, result.photos.photo[i].id, result.photos.photo[i].secret);

      					self.photos.push({
      						"url": imageUrl,
      						"filename": filename,
      						"secure": true
      					});
      				}

              resolve(self.photos);

      			}
      		}
      	);
      });
    });


  }

  getFlickrUrl(farm, server, id, secret) {
  	return `https://farm${farm}.staticflickr.com/${server}/${id}_${secret}_h.jpg`;
  }

  getFilename(id, secret) {
  	return `${id}_${secret}_h.jpg`;
  }

  padNumber(numberToPad, numberLength) {
  	const stringNumber = numberToPad.toString();
  	const stringLength = stringNumber.length;
  	const zeroesToPad = numberLength - stringLength;
  	let outputString = "";
  	for (let i = 1; i <= zeroesToPad; i++) {
  		outputString += "0";
  	}
  	return outputString + stringNumber;
  }

}

module.exports = FlickrImageManager;
