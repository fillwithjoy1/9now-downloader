import {browser_mass_download} from "./functions";
import * as fs from "node:fs";

// Define job types in TS
interface Playlist {
    name: string;
    link: string;
    length: number;
    folder_name: string;
    skip?: boolean;
}

interface ScanList {
    name: string;
    link: string;
    folder_name: string;
    skip?: boolean;
}

interface JobSchema {
    playlists: Playlist[];
    scan: ScanList[];
}

main().then();

// TODO: Add implementation for website mass-scans
async function main(): Promise<void> {
    if (fs.existsSync("jobs.json")) {
        const data = fs.readFileSync("jobs.json").toString();
        const jobs: JobSchema = JSON.parse(data);
        console.log(`💡 Found ${jobs.playlists.length} jobs to do`);
        for (let i = 0; i < jobs.playlists.length; i++) {
            if (jobs.playlists[i].skip === true) {
                console.log(`🦘 Skipping job ${jobs.playlists[i].name}`)
                continue;
            }
            console.log(`⚒️ Starting job ${jobs.playlists[i].name}`);
            await browser_mass_download(jobs.playlists[i].link, jobs.playlists[i].folder_name, jobs.playlists[i].length);
            console.log(`✅ Finished job successfully, ${i + 1}/${jobs.playlists.length}`)
        }


    } else {
        console.log("There is no jobs.json created");
        console.log("Create a jobs.json file to run a download job as needed");
    }
}