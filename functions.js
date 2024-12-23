// What does this file do? Well it contains functions that are used in jobs.ts
// Why? Because calling functions from there wakes up rl.question and that's not good

import puppeteer from "puppeteer";
import {exec} from "child_process";
import fs from "node:fs";

// Credentials manager
let email = "";
let password = "";
if (fs.existsSync("password")) {
    fs.readFile("password", "utf8", (err, data) => {
        if (err) {
            console.error(err);
        }
        email = data.split("\r\n")[0];
        password = data.split("\r\n")[1];
    });
}

// Internal function that enables logging to console if enabled
function log(data, type) {
    // Values allowed are "debug", "info" or "none"
    const logging = "info";
    switch (type) {
        case "debug":
            if (logging === "debug") console.log(data);
            break;
        case "info":
            if (logging !== "none") console.log(data);
            break;
    }
}

export async function browser_mass_download(playlist_url, folder_output, length) {
    const browser = await Browser.create();
    const download_links = [];
    await Lock.lock();
    for (let i = 1; i <= length; i++) {
        download_links.push(await browser.downloadSingleVideo(`${playlist_url}/episode-${i}`));
        log("🔗 Fetched links", "info");
    }
    log("⬇️ Starting download", "info");
    for (let i = 0; i < download_links.length; i++) {
        await python_download_video(download_links[i][0], download_links[i][1], folder_output, `Ep ${i + 1} - ${download_links[i][2]}`, download_links[i][3]);
    }
    await Lock.unlock();
    process.exit(0);
}

export async function browser_scan_download(playlist_url, folder_output) {
    const browser = await Browser.create();
    await Lock.lock();
    const scanned_links = await browser.scanForVideos(playlist_url);
    const download_links = [];
    log("🛰️ Scanned for links", "info");
    for (let i = 0; i <= scanned_links.length; i++) {
        download_links.push(await browser.downloadSingleVideo(scanned_links[i]));
        log("🔗 Fetched links", "info");
    }
    for (let i = 0; i < download_links.length; i++) {
        await python_download_video(download_links[i][0], download_links[i][1], folder_output, download_links[i][2], download_links[i][3]);
    }
    await Lock.unlock();
    process.exit(0);
}

// TODO: Privatise some functions, if possible
// TODO: await page.close() doesn't do anything - this is a Firefox issue
export class Browser {
    // Launch the browser
    constructor() {
        // Stop the no timeout errors
        this.noTimeout = {
            timeout: 0,
        }
    }

    static async create() {
        const browserInstance = new this();
        await browserInstance.launch();
        return browserInstance;
    }

    // This function should never be called at all as it's already called using constructor
    async launch() {
        this.browser = await puppeteer.launch({
            channel: 'chrome',
            headless: false,
            ignoreDefaultArgs: [
                '--disable-component-update'
            ]
        });
        this.page = await this.browser.newPage();
        await this.login();
    }

    // Logs into 9Now
    login() {
        return new Promise(async resolve => {
            await this.page.goto('https://login.nine.com.au/login?client_id=9now-web', this.noTimeout);

            await this.page.type('#input_email', email);

            await this.page.click('button[type="submit"]');

            await this.page.waitForNavigation(this.noTimeout);

            await this.page.type('#input_password', password);

            await this.page.click('button[type="submit"]');

            log("👤 Logged in!", "info")

            resolve();
        });
    }

    // Goes to specified link and returns the download video link and license URL required
    // Returns 0 for the license_url, if it's a non-drm video
    async downloadSingleVideo(website_url) {
        return new Promise(async (resolve, reject) => {

            const page = await this.browser.newPage();

            await page.goto(website_url, this.noTimeout);

            await page.waitForSelector('video', this.noTimeout);
            const drmStatus = await this.checkDRMStatus(page);
            log(drmStatus, "debug");

            // Reload page if download task didn't finish after 60 seconds
            this.autoRestart = setInterval(async () => {
                log("♻️ Reloading page", "info");
                await page.reload(this.noTimeout);
            }, 60000);

            // If the download task didn't finish after 5 minutes, skip
            this.autoSkip = setTimeout(async () => {
                log("🕒 Timed out, skipping", "info");
                await this.safelyWait(page);
                await page.close();
                // FIXME: reject();
                resolve([0, 0, 0, 0]);
            }, 290000);

            this.videoUrl = '';
            this.licenseUrl = '';
            this.imageUrl = '';
            // TODO: This doesn't account for the title being completely empty
            this.title = await this.fetchTitle(page);

            this.listenForDRMLinks = async request => {
                if (request.url().includes("manifest.mpd") && this.videoUrl === '' && !request.url().includes("brightcove") && !request.url().includes("infinity")) {
                    this.videoUrl = request.url();
                    log("Fetch video", "debug");
                    log(request.url(), "debug");
                    await exitFunction(page);
                }

                if (request.url().includes("license", "debug")) {
                    this.licenseUrl = request.url();
                    log("Fetch License", "debug");
                    log(this.licenseUrl, "debug");
                    await exitFunction(page);
                }

                if (request.url().includes("image.jpg")) {
                    this.imageUrl = request.url();
                    log("Fetch image", "debug");
                    log(this.imageUrl, "debug");
                    await exitFunction(page);
                }
            }

            this.listenForLinks = async request => {
                if (request.url().includes("image.jpg")) {
                    this.imageUrl = request.url();
                    log("Fetch image", "debug");
                    log(this.imageUrl, "debug");
                    await exitFunction(page);
                }

                if (request.url().includes("master.m3u8") && !request.url().includes("brightcove")) {
                    this.videoUrl = request.url();
                    log("Fetch video", "debug");
                    log(request.url(), "debug");
                    await exitFunction(page);
                }
            }

            let exitFunction = async page => {
                if (drmStatus) {
                    if (this.videoUrl.length > 0 && this.licenseUrl.length > 0 && this.imageUrl.length > 0) {
                        clearInterval(this.autoRestart);
                        clearTimeout(this.autoSkip);
                        page.off("request", request => this.listenForDRMLinks(request));
                        await this.safelyWait(page);
                        await page.close();
                        resolve([this.videoUrl, this.licenseUrl, this.title, this.imageUrl]);
                    }
                } else {
                    if (this.videoUrl.length > 0 && this.imageUrl.length > 0) {
                        clearTimeout(this.autoRestart);
                        clearTimeout(this.autoSkip);
                        page.off("request", request => this.listenForLinks(request));
                        await this.safelyWait(page);
                        await page.close();
                        resolve([this.videoUrl, 0, this.title, this.imageUrl]);
                    }
                }
                await this.close();
            }

            page.on("request", request => {
                if (drmStatus) this.listenForDRMLinks(request);
                else this.listenForLinks(request);
            });
        });
    }

    async scanForVideos(website_url) {
        return new Promise(async resolve => {
            const page = await this.browser.newPage();

            await page.goto(website_url, this.noTimeout);

            await this.autoScroll(page);

            resolve(page.$$eval('.GX-Ppj', a => {
                return a.map(a => a.href);
            }));

            await this.safelyWait(page);
            await page.close();
        });
    }

    async fetchTitle(page) {
        return await page.$eval('._3JyyHX', t => t.innerHTML);
    }

    // FIXME: This function is unreliable
    async check404(page) {
        return (await page.title() === "Page not found");
    }

    async checkDRMStatus(page) {
        const videoElement = await page.$eval('video', e => {
            return e.getAttribute('data-param-video-asset');
        });
        if (videoElement) {
            return JSON.parse(videoElement)["video"]["drm"]
        } else {
            throw new Error("Failed to fetch video element")
        }
    }

    async autoScroll(page) {
        return new Promise(async resolve => {
            setTimeout(() => {
                clearInterval(timer);
                resolve();
            }, 30000);

            let timer = setInterval(() => {
            }, 10000);

            await page.evaluate(async () => {
                timer = setInterval(() => {
                    window.scrollBy(0, 1000);
                }, 1000);
            });
        });
    }

    async safelyWait(page) {
        while (page.mainFrame().detached) {
            await sleep(100);
        }
    }

    async close() {
        // FIXME: Disabled these functions for the time being
        // await this.browser.disconnect();
        // await this.browser.close();
    }
}

export function python_download_video(video_link, license_url, folder_output = "output", file_name, image_url) {
    return new Promise(resolve => {
        const command = `python main.py --video_url="${video_link}" --license_url="${license_url}" --output=${folder_output} --file_name="${file_name}" --image_url="${image_url}"`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(error);
            }

            if (stderr) {
                console.error(stderr);
            }
            log(stdout, "debug");
            resolve();
        })
    });
}

export class Lock {
    static status() {
        return fs.existsSync("node.lock");
    }

    static lock() {
        return new Promise(async resolve => {
            if (this.status()) console.warn("🔒 Lock is active");
            while (this.status()) {
                await sleep(3000);
            }
            fs.writeFileSync("node.lock", "");
            resolve();
        });
    }

    static unlock() {
        try {
            fs.unlinkSync("node.lock");
        } catch (e) {
            console.warn(e);
        }
    }
}

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}