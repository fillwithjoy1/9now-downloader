// This file powers the magic. It's currently based on rl.question,
// mainly because I can't make node work easily :(
// Reliability is not there for this file

import {exec} from "child_process";
import puppeteer from 'puppeteer';
import * as readline from "node:readline";
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

// Helper timeout function
async function timeout(delay) {
    return new Promise(resolve => {
        setTimeout(resolve, delay);
    })
}

let actual_file_name = '';
let video_link = '';
let license_url = '';
let tripped = false;

// This special variable is a flag to change how the JS code runs
// When set to 0, it can download stuff individually
// When set to 1, it can mass-download multiple videos
let path = 0;

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
rl.question(`Download one video, or an entire playlist? (1, 2)`, option => {
    if (["1", "2", "3"].includes(option)) {
        path = Number(option);
        download_video();
    } else {
        console.log('Invalid choice. Exiting');
        process.exit(2);
    }
});

function download_video() {
    switch (path) {
        case 0:
            process.exit(3);
            break
        case 1:
            rl.question(`Website URL `, url => {
                rl.question('File name ', file => {
                    actual_file_name = file;
                    rl.close();
                    waitForLock().then(async () => {
                        console.log("Execution started");
                        await download_single_video(url);
                    });
                });
            });
            break;
        case 2:
            rl.question(`Playlist URL`, url => {
                rl.question(`Output folder name`, folder => {
                    rl.close();
                    waitForLock().then(() => {
                        download_playlist(url, folder).then(() => {
                        });
                    });
                });
            });
            break;
    }
}

function waitForLock() {
    return new Promise(async resolve => {
        while (Lock.status()) {
            console.log("Lock is active...")
            await sleep(3000);
        }
        Lock.lock();
        resolve();
    });
}

class Lock {
    static status() {
        return fs.existsSync("node.lock");
    }

    static lock() {
        fs.writeFileSync("node.lock", "");
    }

    static unlock() {
        try {
            fs.unlinkSync("node.lock");
        } catch (e) {
            console.warn(e);
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function download_playlist(playlist_url, folder_output) {
    // Launch the browser and open a new blank page
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

    console.log(await validate_playlist_length(page, playlist_url));
    console.warn("DONE");

    // TODO: Download the videos after retrieving the playlist length
    // FIXME: Unlock the Lock, if needed
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

// NOTE: This is a helper function that supposed to fix a timeout issue
async function timeout_browse(browser, url, timeout) {
    browser.goto(url).then(() => {
        return 0
    });
}

export async function download_single_video(website_url, file_name, folder_output = "output") {
// Launch the browser and open a new blank page
// TODO: Fix the duplicate code fragments
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

    page.on("request", async request => {
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
            start_downloads(video_link, license_url, file_name)
        }
    });

    if (file_name === undefined) {
        await page.goto(website_url, {
            waitUntil: "domcontentloaded",
        });
    } else {
        await page.goto(website_url);
    }

    if (file_name === undefined) {
        console.log("oh I work!")
        const title = await page.$eval('._3JyyHX', t => t.innerHTML);
        console.log(title);
        console.log("Hello!")
        console.log(file_name);
    }

    function start_downloads(video_link, license_url, file_name) {
        if (!tripped) {
            tripped = true;
            browser.close();
            const command = `python main.py --video_url="${video_link}" --license_url="${license_url}" --file_name="${file_name}"`;
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
}