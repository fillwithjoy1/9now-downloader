// FIXME: Use camelCase naming conventions
// FIXME: Remove like the 100 functions here

import {exec} from "child_process";
import puppeteer from 'puppeteer';
import * as readline from "node:readline/promises";
import * as fs from "node:fs";

// Credentials Manager
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

// FIXME: Migrate to sleep(ms)
// Helper timeout function
async function timeout(delay) {
    return new Promise(resolve => {
        setTimeout(resolve, delay);
    })
}

// Helper function to sleep async code
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// FIXME: What the hell does this variable do?
let actual_file_name = '';
let video_link = '';
let license_url = '';
let tripped = false;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// TODO: Import rl.question to parse arguments
// TODO: For downloading entire sports, we can do a link scan between 1 - infinite (where it stops once it encounters a 404)
// TODO: Fix download issues, or add auto-restarts to shaft this problem completely
//  It's occurring due to random ad breaks occurring
// TODO: Get it working in headless mode. So far, we are relying heavily on auto-play to do the work
//  That will have to be changed
rl.question(`Download one video, or an entire playlist? (1, 2) `).then(option => {
    download_video(Number(option));
});

async function download_video(path) {
    switch (path) {
        case 0:
            process.exit(3);
            break
        case 1:
            const url_1 = await rl.question(`Website URL `);
            const file_1 = await rl.question(`File name `)
            actual_file_name = file_1;
            await rl.close();
            await download_single_video(url_1, file_1);
            break;
        case 2:
            const url_2 = await rl.question(`Playlist URL `);
            const folder_2 = await rl.question(`Output folder name `);
            await rl.close();
            await navigate_playlist(url_2, folder_2);
            break;
        case 3:
            const url_3 = await rl.question(`Playlist URL `);
            const folder_3 = await rl.question(`Output folder name `);
            const length_3 = await rl.question(`Playlist length `);
            await rl.close();
            await download_playlist(url_3, folder_3, length_3);
            break;
        case 4:
            const url_4 = await rl.question(`Playlist URL `);
            const folder_4 = await rl.question(`Output folder name `);
            const length_4 = await rl.question(`Playlist length `);
            await rl.close();
            await browser_mass_download(url_4, folder_4, length_4);
            break;
        default:
            console.log('Invalid choice. Exiting');
            process.exit(2);
    }
}

class Lock {
    static status() {
        return fs.existsSync("node.lock");
    }

    static lock() {
        return new Promise(async resolve => {
            while (this.status()) {
                console.log("Lock is active...");
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

// Used to URL scan a whole function
export async function navigate_playlist(playlist_url, folder_output) {
    // Launch the browser and open a new blank page
    const browser = await puppeteer.launch({
        browser: 'firefox',
        headless: false,
        extraPrefsFirefox: {
            'media.gmp-manager.updateEnabled': true,
        },
    });
    const page = await browser.newPage();

    // Login to 9 Now
    await page.goto('https://login.nine.com.au/login?client_id=9now-web');

    await page.type('#input_email', email);

    await page.click('button[type="submit"]');

    await page.waitForNavigation();

    await page.type('#input_password', password);

    await page.click('button[type="submit"]');

    await sleep(5000);

    console.log(await validate_playlist_length(page, playlist_url));
    console.warn("DONE");

    // TODO: Download the videos after retrieving the playlist length
    // FIXME: Unlock the Lock, if needed
}

async function download_playlist(playlist_url, folder_output, length) {
    await Lock.lock();
    Lock.unlock();
    for (let i = 1; i <= length; i++) {
        await download_single_video(`${playlist_url}/episode-${i}`, `Ep ${i} - `, folder_output, true);
    }
}

export async function validate_playlist_length(browser, playlist_url) {
    // NOTE: This method is so bad, it could be improved massively
    //  Especially with how we are receiving constant timeout errors
    for (let i = 1; i > 0; i++) {
        await go_to_page(browser, `${playlist_url}/episode-${i}`);

        const title = await browser.title();

        if (title === "Page not found") {
            return i - 1;
        }
    }
}

async function go_to_page(browser, url) {
    const title = await browser.title();
    console.log(title);
    await browser.goto(url, {
        waitUntil: 'load'
    });

    while (await browser.title() === title) {
        await timeout(1000);
        console.log(title);
    }
}

async function browser_mass_download(playlist_url, folder_output, length) {
    const browser = await Browser.create();
    await Lock.lock();
    Lock.unlock();
    for (let i = 1; i <= length; i++) {
        const test = await browser.downloadSingleVideo(`${playlist_url}/episode-${i}`);
        console.log(test);
        process.exit(69);
    }
}

// Handles all browser functions required
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
            // FIXME: Auto-restarts can and will cause an *infinite loop*
            this.autoRestart = setTimeout(() => {
                page.off("request", request => this.listenForLinks(request));
                this.downloadSingleVideo(website_url);
            }, 60000);

            await page.goto(website_url, this.noTimeout);

            this.videoUrl = '';
            this.licenseUrl = '';

            this.listenForLinks = request => {
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
                    page.close();
                    resolve([this.videoUrl, this.licenseUrl]);
                }
            }

            page.on("request", request => this.listenForLinks(request));
        });
    }
}

export async function download_single_video(website_url, file_name = "", folder_output = "output", append_file_name = false) {
// Launch the browser and open a new blank page
// TODO: Fix the duplicate code fragments
    await Lock.lock();
    const browser = await puppeteer.launch({
        browser: 'firefox',
        headless: false,
        timeout: 0,
        extraPrefsFirefox: {
            'media.gmp-manager.updateEnabled': true,
        },
    });
    const page = await browser.newPage();

// Login to 9 Now
    await page.goto('https://login.nine.com.au/login?client_id=9now-web');

    await page.type('#input_email', email);

    await page.click('button[type="submit"]');

    await page.waitForNavigation();

    await page.type('#input_password', password);

    await page.click('button[type="submit"]');

    await sleep(5000);

    // A cool sounding variable that just checks if the stage two of the process has failed, and then auto-restart
    let rocket_check = '';

    while (rocket_check !== true) {
        try {
            await stage_two(page, file_name, append_file_name, website_url, browser, folder_output);

            rocket_check = true;
        } catch (e) {
            console.log("Timed out. Retrying...")
        }
    }
}

async function stage_two(page, file_name, append_file_name, website_url, browser, folder_output) {
    return new Promise(async (resolve, reject) => {

        function cleanup() {
            clearTimeout(timeout);
            resolve();
        }

        const timeout = setTimeout(() => reject(new Error("Timed out after 60 seconds")), 120000);

        // NOTE: Yikes too many variables
        page.on("request", async request => listenForLinks(request, file_name, browser, folder_output, cleanup));

        await page.goto(website_url, {
            waitUntil: "domcontentloaded",
        });

        if (!file_name || append_file_name) {
            const title = await page.$eval('._3JyyHX', t => t.innerHTML);
            console.log(title);
            console.log("Hello!")
            console.log(file_name);
            file_name += title;
        }
    });
}

function listenForLinks(request, file_name, browser, folder_output, resolve) {
    // FIXME: Use case/switch here
    if (request.url().includes("manifest.mpd") && video_link === '' && !request.url().includes("brightcove")) {
        video_link = request.url();
        console.log("Fetch video");
        console.log(request.url());
    }
    if (request.url().includes("license")) {
        license_url = request.url();
        console.log("Fetch License");
        console.log(license_url);
    }
    if (video_link.length > 0 && license_url.length > 0) {
        resolve();
        start_downloads(video_link, license_url, file_name, browser, folder_output)
    }
}

function start_downloads(video_link, license_url, file_name, browser, folder_output) {
    if (!tripped) {
        tripped = true;
        browser.close();
        const command = `python main.py --video_url="${video_link}" --license_url="${license_url}" --output=${folder_output} --file_name="${file_name}"`;
        console.log("Starting python script")
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.log(stderr);
            }

            if (stderr) {
                console.log(stderr);
            }
            console.log(stdout);
            Lock.unlock();
        });
    }
}

function python_download_video(video_link, license_url, folder_output, file_name) {
    const command = `python main.py --video_url="${video_link}" --license_url="${license_url}" --output=${folder_output} --file_name="${file_name}"`;
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(error);
        }

        if (stderr) {
            console.error(stderr);
        }
        console.log(stdout);
        Lock.unlock();
    })
}