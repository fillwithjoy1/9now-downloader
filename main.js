import { exec } from "child_process";
import puppeteer from 'puppeteer';
import * as readline from "node:readline";
import * as fs from "node:fs";

let input_url = ''
let actual_file_name = ''
let video_link = ''
let license_url = ''
let tripped = false

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

rl.question(`Website URL `, url => {
    input_url = url;
    rl.question('File name ', file => {
        actual_file_name = file;
        rl.close();
        checkForLock(input_url, actual_file_name);
    });
});

function checkForLock(input_url, actual_file_name) {
    if (Lock.status()) {
        console.log("Lock is active...")
        setTimeout(() => checkForLock(), 3000);
    } else {
        Lock.lock();
        main(input_url, actual_file_name).then(() => {});
    }
}

class Lock {
    static status() {
        return fs.existsSync("node.lock")
    }
    static lock() {
        fs.writeFileSync("node.lock", "")
    }
    static unlock() {
        fs.unlinkSync("node.lock")
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function main(website_url, file_name) {
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

    await page.type('#input_email', 'REDACTED');

    await page.click('button[type="submit"]');

    await page.waitForNavigation();

    await page.type('#input_password', 'REDACTED');

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

    function start_downloads(video_link, license_url, file_name) {
        if (!tripped) {
            tripped = true;
            browser.close();
            const command = `python311 main.py --video_url="${video_link}" --license_url="${license_url}" --file_name="${file_name}"`;

            console.log("Starting python script")
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.log(stderr);
                }

                if (stderr) {
                    console.log(stderr);
                }
                console.log(stdout);
            });
        }
    }
}