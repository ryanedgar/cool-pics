const os = require("os");
const Flickr = require("flickrapi");
const https = require("https");
const http = require("http");
const fs = require("fs");
const url = require("url");

const apiKey = "";
const secret = "";
const redditUrls = [
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

let photos = [];
let photoCount = 0;
let sourceCount = 0;
let picsComplete = 0;
let totalPics = 0;
let imageTimeout;
let photosCopy = [];

let flickrOptions = {
		api_key: apiKey,
		secret: secret
};
console.info("Lockscreen pics startup");

const searchDate = new Date();
console.log(`Running update on ${searchDate}`);
searchDate.setDate(searchDate.getDate() - 1);
const yearString = padNumber(searchDate.getFullYear(), 0);
const monthString = padNumber(searchDate.getMonth() + 1, 2);
const dayString = padNumber(searchDate.getDate(), 2);
const yesterday = `${yearString}-${monthString}-${dayString}`;

clearPhotos();

Flickr.tokenOnly(flickrOptions, (error, flickr) => {

	flickr.interestingness.getList(
		{
			date: yesterday,
			page: 1,
			per_page: 100
		},
		function (err, result) {
			if (err) {
				console.log(err);
			}
			else {
				photoCount = result.photos.photo.length;
				for (let i = 0; i < result.photos.photo.length; i++) {
					let filename = getFilename(result.photos.photo[i].id, result.photos.photo[i].secret),
						imageUrl = getFlickrUrl(result.photos.photo[i].farm, result.photos.photo[i].server, result.photos.photo[i].id, result.photos.photo[i].secret);

					photos.push({
						"url": imageUrl,
						"filename": filename,
						"secure": true
					});
					if (i == (result.photos.photo.length - 1)) {
						getRedditPics();
					}
				}
			}
		}
	);
});

function getRedditPics() {
	redditUrls.forEach((redditUrl) => {
		https.get(redditUrl, function (res) {
			let body = "";

			res.on("data", function (chunk) {
				body += chunk;
			});

			res.on("end", function () {
				try {
					const redditResponse = JSON.parse(body)
					processRedditPosts(redditResponse.data.children);
				}
				catch (e) {
					console.error("Reddit not available");
				}
			});
		});
	});
}

function processRedditPosts(postList) {
	sourceCount++;
	postList.forEach((post) => {
		let imageUrl = post.data.url;
		const isImgur = isValidImgur(imageUrl);
		if (isImgur) imageUrl = getImgurUrl(imageUrl);
		const pathSplit = imageUrl.split("/");
		const filename = pathSplit[pathSplit.length - 1];
		const fileType = filename.split(".");
		const fileExtension = fileType[fileType.length - 1].toLowerCase();

		if (fileType[fileType.length - 1] === "jpg" || isImgur) {
			let secure = pathSplit[0].toLowerCase() === "https:";
			photos.push({
				"url": imageUrl,
				"filename": filename,
				"secure": secure
			});
		}
	});
	if (sourceCount === redditUrls.length) savePhotos();
}

function getImgurUrl(imageUrl) {
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

function isValidImgur(imageUrl) {
	return imageUrl.toLowerCase().indexOf("imgur.com") > -1 && imageUrl.toLowerCase().indexOf("/gallery") === -1;
}

function savePhotos() {
	totalPics = photos.length;
	photos.forEach((photo) => {
		try {
			savePhoto(photo.url, photo.filename, photo.secure);
		}
		catch (e) {
			totalPics--;
		}
	});
}

function getFlickrUrl(farm, server, id, secret) {
	return `https://farm${farm}.staticflickr.com/${server}/${id}_${secret}_h.jpg`;
}

function getFilename(id, secret) {
	return `${id}_${secret}_h.jpg`;
}


function savePhoto(imageUrl, filename, secure) {
	const savePath = `${os.homedir()}\\Pictures\\lockscreen\\${filename}`;
	forceCloseTimer();
	if (secure) {
		https.get(imageUrl, (response) => {
			if (response.statusCode === 200 && savePath.indexOf("?") === -1) {
				try {
					response
						.pipe(fs.createWriteStream(savePath))
						.on("finish", () => {
							picsComplete++;
							console.log(`Complete: ${picsComplete} / ${totalPics}`);
							checkComplete();
							forceCloseTimer();
						});
				}
				catch (e) {
					// Ignore
					totalPics--;
					checkComplete();
					forceCloseTimer();
				}
			}
			else {
				//console.log("File doesn't exist");
				totalPics--;
				checkComplete();
				forceCloseTimer();
			}
			checkComplete();
		})
		.on("error", (err) => {
			totalPics--;
			checkComplete();
			forceCloseTimer();
		});
	}
	else {
		http.get(imageUrl, (response) => {
			if (response.statusCode === 200 && savePath.indexOf("?") === -1) {
				try {
					response
						.pipe(fs.createWriteStream(savePath))
						.on("finish", () => {
							picsComplete++;
							console.log(`Complete: ${picsComplete} / ${totalPics}`);
							checkComplete();
							forceCloseTimer();
						});
				}
				catch (e) {
					// Ignore
					totalPics--;
					checkComplete();
					forceCloseTimer();
				}
			}
			else {
				//console.log("File doesn't exist");
				totalPics--;
				checkComplete();
				forceCloseTimer();
			}
			checkComplete();
		})
		.on("error", (err) => {
			totalPics--;
			checkComplete();
			forceCloseTimer();
		});
	}
}

function checkComplete() {
	if (picsComplete === totalPics) {
		process.exit();
	}
}

function clearPhotos() {
	const photoDir = `${os.homedir()}\\Pictures\\lockscreen`;
	const fileList = fs.readdirSync(photoDir);
	fileList.forEach((file) => {
		let filePath = `${photoDir}\\${file}`;
		fs.unlink(filePath);
	});
	photos = [];
	photoCount = 0;
}

function padNumber(numberToPad, numberLength) {
	const stringNumber = numberToPad.toString();
	const stringLength = stringNumber.length;
	const zeroesToPad = numberLength - stringLength;
	let outputString = "";
	for (let i = 1; i <= zeroesToPad; i++) {
		outputString += "0";
	}
	return outputString + stringNumber;
}

function forceCloseTimer() {
	if (typeof imageTimeout !== "undefined") clearTimeout(imageTimeout);
	imageTimeout = setTimeout(() => {
		console.log("Exiting");
		process.exit();
	},
	60 * 1000);
}
