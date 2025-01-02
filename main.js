// FIXME: Use camelCase naming conventions
// FIXME: Remove like the 100 functions here

import {exec} from "child_process";
import puppeteer from 'puppeteer';
import * as readline from "node:readline/promises";
import * as fs from "node:fs";
import {Browser, browser_mass_download, python_download_video, sleep} from "./functions.js";

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

// FIXME: What the hell does this variable do?

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

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
            await browser_mass_download(url_3, folder_3, length_3);
            break;
        case 4:
            const url_4 = await rl.question(`Video URL`);
            await rl.close();
            const browser = await Browser.create();
            await Lock.lock();
            const data_4 = await browser.downloadSingleVideo(url_4);
            await python_download_video(data_4[0], data_4[1], 'output', data_4[2], data_4[3]);
            Lock.unlock();
            break;
        default:
            console.log('Invalid choice. Exiting');
            process.exit(2);
    }
}