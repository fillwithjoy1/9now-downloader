// FIXME: Use camelCase naming conventions

import * as readline from "node:readline/promises";
import * as fs from "node:fs";
import {Browser, browser_mass_download, python_download_video, Lock} from "./functions.js";

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

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// TODO: Get it working in headless mode. So far, we are relying heavily on auto-play to do the work
//  That will have to be changed
rl.question(`Download one video, or an entire playlist? (1, 2) `).then(async option => {
    switch (Number(option)) {
        case 0:
            process.exit(3);
            break;
        case 1:
            const url_1 = await rl.question(`Video URL`);
            await rl.close();
            const browser = await Browser.create();
            await Lock.lock();
            const data_1 = await browser.downloadSingleVideo(url_1);
            console.log("⬇️ Starting download");
            await python_download_video(data_1[0], data_1[1], 'output', data_1[2], data_1[3]);
            Lock.unlock();
            break;
        case 2:
            const url_2 = await rl.question(`Playlist URL `);
            const folder_2 = await rl.question(`Output folder name `);
            const length_2 = await rl.question(`Playlist length `);
            await rl.close();
            await browser_mass_download(url_2, folder_2, length_2);
            break;
        default:
            console.log('Invalid choice. Exiting');
            process.exit(2);
}
});