import Bottleneck from "bottleneck";
import RedditImageManager from './RedditImageManager.mjs';
import fs from 'fs';
import os from 'os';
import url from 'url';
import http from 'http';
import https from 'https';
import { createWriteStream } from 'fs';
import { Readable } from 'stream';

import pkg from 'terminal-kit';
const { terminal } = pkg;
// const os = require('os');
// const fs = require('fs');
// const url = require('url');
// const { terminal } = require('terminal-kit');

// const RedditImageManager = require('./RedditImageManager');
// const FlickrImageManager = require('./FlickrImageManager');

let progressBar;

export default class ImageManager {
    constructor(flickrApiKey, flickrApiSecret, flickrImageCount = 100) {
        this.clearPhotos();
        this.redditImageManager = new RedditImageManager();
        // this.flickrImageManager = new FlickrImageManager(
        //     flickrApiKey,
        //     flickrApiSecret,
        //     flickrImageCount
        // );
        this.photos = [];
        this.totalPics = 0;
        this.picsComplete = 0;
        this.imageTimeout = null;
        this.picCount = 0;
        this.limiter = new Bottleneck({
            maxConcurrent: 1,
            minTime: 6500,
        });
    }

    getPhotos() {
        let redditImages = this.redditImageManager.getRedditPics();
        // let flickrImages = this.flickrImageManager.getFlickrPics();

        // Promise.all([redditImages, flickrImages])
        Promise.all([redditImages])
            .then((results) => {
                // this.photos = [...results[0], ...results[1]];
                this.photos = [...results[0]];
                this.totalPics = this.photos.length;
                if (this.picCount === 0) {
                    this.picCount = this.totalPics;
                }
                progressBar = terminal.progressBar({
                    width: 100,
                    title: 'Downloading images',
                    eta: true,
                    percent: true,
                    items: this.picCount,
                });
                try {
                    this.savePhotos();
                } catch (e) {
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
                progressBar.startItem(photo.url);
                this.limiter.schedule(() => {
                    this.savePhoto(photo.url, photo.filename, photo.secure);
                });
            } catch (e) {
                progressBar.itemDone(photo.url);
                this.totalPics--;
                console.log(e);
            }
        });
    }

    async savePhoto(imageUrl, filename, secure) {
        const savePath = `${os.homedir()}/Pictures/lockscreen/${filename}`;
        const lib = secure ? https : http;

        this.forceCloseTimer();

        try {
            const response = await fetch(imageUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                    'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
                    'Referer': 'https://www.reddit.com/',
                },
            });

            if (!response.ok || savePath.indexOf('?') !== -1) {
                progressBar.itemDone(imageUrl);
                //console.log("File doesn't exist");
                this.totalPics--;
                this.checkComplete();
                this.forceCloseTimer(); 
            } else {
                // Stream the response to disk to avoid high memory use
                const nodeStream = Readable.fromWeb(response.body);
                const fileStream = createWriteStream(savePath);
                await new Promise((resolve, reject) => {
                    nodeStream.pipe(fileStream);
                    nodeStream.on('error', () => {
                        progressBar.itemDone(imageUrl);
                        // Ignore
                        this.totalPics--;
                        this.checkComplete();
                        this.forceCloseTimer();
                        reject();
                    });
                    fileStream.on('finish', () => {
                        progressBar.itemDone(imageUrl);
                        this.picsComplete++;
                        this.checkComplete();
                        this.forceCloseTimer();
                        resolve();
                    });
                });
            }
        } catch (err) {
            console.log(err);
            progressBar.itemDone(imageUrl);
            // Ignore
            this.totalPics--;
            this.checkComplete();
            this.forceCloseTimer();
        }
        this.checkComplete();
        
        // lib.get(imageUrl, (response) => {
        //     if (response.statusCode === 200 && savePath.indexOf('?') === -1) {
        //         try {
        //             response.pipe(fs.createWriteStream(savePath)).on('finish', () => {
        //                 progressBar.itemDone(imageUrl);
        //                 this.picsComplete++;
        //                 // console.log(
        //                 //     `Complete: ${this.picsComplete} / ${
        //                 //         this.totalPics
        //                 //     }`
        //                 // );
        //                 this.checkComplete();
        //                 this.forceCloseTimer();
        //             });
        //         } catch (e) {
        //             progressBar.itemDone(imageUrl);
        //             // Ignore
        //             this.totalPics--;
        //             this.checkComplete();
        //             this.forceCloseTimer();
        //         }
        //     } else {
        //         progressBar.itemDone(imageUrl);
        //         //console.log("File doesn't exist");
        //         this.totalPics--;
        //         this.checkComplete();
        //         this.forceCloseTimer();
        //     }
        //     this.checkComplete();
        // }).on('error', (err) => {
        //     progressBar.itemDone(imageUrl);
        //     this.totalPics--;
        //     this.checkComplete();
        //     this.forceCloseTimer();
        // });
    }

    checkComplete() {
        if (this.picsComplete === this.totalPics) {
            process.exit();
        }
    }

    forceCloseTimer() {
        if (typeof this.imageTimeout !== 'undefined') clearTimeout(this.imageTimeout);
        this.imageTimeout = setTimeout(() => {
            console.log('Exiting');
            process.exit();
        }, 60 * 1000);
    }

    clearPhotos() {
        const photoDir = `${os.homedir()}/Pictures/lockscreen`;
        const fileList = fs.readdirSync(photoDir);
        fileList.forEach((file) => {
            let filePath = `${photoDir}/${file}`;
            fs.unlinkSync(filePath);
        });
        this.photos = [];
    }
}

// module.exports = ImageManager;
