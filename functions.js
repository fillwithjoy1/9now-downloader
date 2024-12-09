// What does this file do? Well it contains functions that are used in jobs.ts
// Why? Because calling functions from there wakes up rl.question and that's not good
// Yes, soon I hope to migrate a lot of the stuff here
// TODO: Migrate stuff from main.js

import puppeteer from "puppeteer";
import {exec} from "child_process";

export async function browser_mass_download(playlist_url, folder_output, length) {
    const browser = await Browser.create();
    const download_links = [];
    await Lock.lock();
    for (let i = 1; i <= length; i++) {
        const test = await browser.downloadSingleVideo(`${playlist_url}/episode-${i}`);
        download_links.push(test);
    }
    // FIXME: We need the ability to detect when we get 404s and extract titles
    for (let i = 0; i < download_links.length; i++) {
        await python_download_video(download_links[i][0], download_links[i][1], folder_output, `Ep ${i + 1} - ${download_links[i][2]}`);
    }
    await Lock.unlock();
    process.exit(69);
}

class Browser {
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
            browser: 'firefox',
            headless: false,
            timeout: 0,
            extraPrefsFirefox: {
                'media.gmp-manager.updateEnabled': true,
            },
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

            resolve();
        });
    }

    // Goes to specified link and returns the download video link and license URL required
    async downloadSingleVideo(website_url) {
        return new Promise(async (resolve, reject) => {

            const page = await this.browser.newPage();

            // If we cannot fetch the links within 60 seconds, auto-restart (hopefully fixes ad-breaks)
            // this.autoRestart = setTimeout(async () => {
            //     try {
            //         await page.close();
            //         const result = await this.downloadSingleVideo(website_url);
            //         resolve(result);
            //     } catch (err) {
            //         reject(err);
            //     }
            // }, 60000);

            // TODO: ⚠️ This serves as an alternative route where the code will skip this job
            this.autoRestart = setTimeout(() => resolve(), 60000);

            await page.goto(website_url, this.noTimeout);

            this.videoUrl = '';
            this.licenseUrl = '';

            this.listenForLinks = async request => {
                // FIXME: Use case/switch here
                if (request.url().includes("manifest.mpd") && this.videoUrl === '' && !request.url().includes("brightcove")) {
                    this.videoUrl = request.url();
                    console.log("Fetch video");
                    console.log(request.url());
                }
                if (request.url().includes("license")) {
                    this.licenseUrl = request.url();
                    console.log("Fetch License");
                    console.log(this.licenseUrl);
                }

                if (this.videoUrl.length > 0 && this.licenseUrl.length > 0) {
                    clearTimeout(this.autoRestart);
                    const title = await this.fetchTitle(page);
                    // FIXME: This is not working
                    await page.close();
                    resolve([this.videoUrl, this.licenseUrl, title]);
                }
            }

            page.on("request", request => this.listenForLinks(request));
        });
    }

    async fetchTitle(page) {
        return await page.$eval('._3JyyHX', t => t.innerHTML);
    }
}

function python_download_video(video_link, license_url, folder_output = "output", file_name) {
    return new Promise(resolve => {
        const command = `python main.py --video_url="${video_link}" --license_url="${license_url}" --output=${folder_output} --file_name="${file_name}"`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(error);
            }

            if (stderr) {
                console.error(stderr);
            }
            console.log(stdout);
            resolve();
        })
    });
}