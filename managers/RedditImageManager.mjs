import Bottleneck from "bottleneck";
import https from 'https';
import http from 'http';
import url from 'url';
import fs from 'fs';
// const https = require('https');
// const http = require('http');
// const url = require('url');
// const fs = require('fs');

export default class RedditImageManager {
    constructor() {
        this.photos = [];
        this.photoCount = 0;
        this.sourceCount = 0;
        this.picsComplete = 0;
        this.totalPics = 0;
        this.imageTimeout;
        this.photosCopy = [];
        const rList = fs.readFileSync('./files.json');
        // Subreddits containing cool images
        this.redditUrls = JSON.parse(rList)
            .sort(() => Math.random() - 0.5) // Randomly shuffle array
            .slice(0, 10); // Take first 10 items
        this.limiter = new Bottleneck({
            maxConcurrent: 1,
            minTime: 6500,
        });
    }

    async getRedditPics() {
        console.log('Getting Reddit Pics');
        let posts = await this.getPosts();
        console.log('Returned ' + posts.length + ' posts');
        return new Promise((resolve, reject) => {
            try {
                posts.forEach((result) => {
                    // const postJson = JSON.parse(result.body);
                    // console.log(result.data.children);
                    this.processRedditPosts(result.data.children);
                });
                resolve(this.photos);
            } catch (e) {
                console.error(e);
                reject([]);
            }
        });
    }

    async getPosts() {
        const responses = [];
        // let promises = this.redditUrls.map(async (redditUrl) => {
        //     // return await this.getPostData(redditUrl);
        //     return await this.limiter.request(redditUrl);
        // });
        for (const redditUrl of this.redditUrls) {
            console.log('Getting ' + redditUrl);
            // Use fetch API with User-Agent header
            const response = await this.limiter.schedule(() => {
                return fetch(redditUrl, {
                    headers: {
                        'User-Agent': 'Image Request Script',
                    },
                });
            });
            const body = await response.text();
            try {
                responses.push(JSON.parse(body));
            } catch (ex) {
                console.log(ex, body);
                process.exit();
            }
        }
        console.log('Got ' + responses.length + ' responses');

        try {
            return responses;
        } catch (ex) {
            console.log(ex);
            return [];
        }
    }

    getPostData(redditUrl, timeout) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const request = https.get(redditUrl, (response) => {
                    // handle http errors
                    if (response.statusCode < 200 || response.statusCode > 299) {
                        reject(new Error('Failed to load page, status code: ' + response.statusCode + '. URL: ' + redditUrl));
                    }
                    // temporary data holder
                    const body = [];
                    // on every content chunk, push it to the data array
                    response.on('data', (chunk) => body.push(chunk));
                    // we are done, resolve promise with those joined chunks
                    response.on('end', () => {
                        console.log('Got URL: ' + redditUrl);
                        resolve(JSON.parse(body.join('')));
                    });
                });
                // handle connection errors of the request
                request.on('error', (err) => reject('Reddit not available'));
            }, timeout);
        });
    }

    processRedditPosts(postList) {
        this.sourceCount++;
        // console.log(postList);
        let i = 0;
        for (let post of postList) {
            let imageUrl = post.data.url;
            const isImgur = this.isValidImgur(imageUrl);
            if (isImgur) imageUrl = this.getImgurUrl(imageUrl);
            const pathSplit = imageUrl.split('/');
            const filename = pathSplit[pathSplit.length - 1];
            const fileType = filename.split('.');
            const fileExtension = fileType[fileType.length - 1].toLowerCase();
            if (fileExtension === 'jpg' || fileExtension === 'jpeg' || isImgur) {
                let secure = pathSplit[0].toLowerCase() === 'https:';
                this.photos.push({
                    url: imageUrl,
                    filename: filename,
                    secure: secure,
                });
            }
        }
        // postList.forEach((post) => {

        // });
        //if (this.sourceCount === redditUrls.length) savePhotos();
    }

    getImgurUrl(imageUrl) {
        let finalUrl = imageUrl;
        let pathInfo = '';
        let urlData = url.parse(imageUrl);
        if (urlData.hostname.toLowerCase() === 'i.imgur.com') {
            finalUrl = `${urlData.protocol}//${urlData.hostname}${urlData.pathname}`;
        } else if (urlData.hostname.toLowerCase() === 'imgur.com') {
            finalUrl = `${urlData.protocol}//i.imgur.com${urlData.pathname}.jpg`;
        }
        return finalUrl;
    }

    isValidImgur(imageUrl) {
        return imageUrl.toLowerCase().indexOf('imgur.com') > -1 && imageUrl.toLowerCase().indexOf('/gallery') === -1;
    }
}

// module.exports = RedditImageManager;
