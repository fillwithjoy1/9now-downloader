// This file powers the magic. It's currently based on rl.question,
// mainly because I can't make node work easily :(
// Reliability is not there for this file

import {exec} from "child_process";
import puppeteer from 'puppeteer';
import * as readline from "node:readline";
import * as fs from "node:fs";

// Credentials Manager
// Probably shouldn't put these as null for the time being
let email = null;
let password = null;
if (fs.existsSync("password")) {
    fs.readFile("password", "utf8", (err, data) => {
        if (err) {
            console.error(err);
        }
        email = data.split("\r\n")[0];
        password = data.split("\r\n")[1];
    });
}

let input_url = ''
let actual_file_name = ''
let video_link = ''
let license_url = ''
let tripped = false

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
rl.question(`Website URL `, url => {
    input_url = url;
    rl.question('File name ', file => {
        actual_file_name = file;
        rl.close();
        waitForLock().then(() => {
            console.log("Execution started");
            navigateToVideo(input_url, actual_file_name).then(() => {
            });
        });
    });
});

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

export async function navigateToVideo(website_url, file_name) {
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

// Navigate the page to a URL.
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

    await page.goto(website_url);

    // This is dangerous due to race conditions... (might need to revisit later)
    if (file_name === null) {
        const title = await page.waitForSelector('#_3JyyHX');
        file_name = await title.evaluate(t => t.textContent);
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