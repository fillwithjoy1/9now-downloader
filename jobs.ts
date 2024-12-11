import {browser_mass_download} from "./functions";
import * as fs from "node:fs";

// Define job types in TS
interface Job {
    name: string;
    link: string;
    length: number;
    folder_name: string;
    skip?: boolean;
    scan?: boolean;
}

interface JobSchema {
    jobs: Job[];
}

main().then();

async function main(): Promise<void> {
    if (fs.existsSync("jobs.json")) {
        const data = fs.readFileSync("jobs.json").toString();
        const jobs: JobSchema = JSON.parse(data);
        console.log(`💡 Found ${jobs.jobs.length} jobs to do`);
        for (let i = 0; i < jobs.jobs.length; i++) {
            if (jobs.jobs[i].skip === true) {
                console.log(`🦘 Skipping job ${jobs.jobs[i].name}`)
                continue;
            }
            console.log(`⚒️ Starting job ${jobs.jobs[i].name}`);
            if (!jobs.jobs[i].scan) {
                await browser_mass_download(jobs.jobs[i].link, jobs.jobs[i].folder_name, jobs.jobs[i].length);
            } else if (jobs.jobs[i].scan === true) {
                // TODO: Add implementation
            }
            console.log(`✅ Finished job successfully, ${i + 1}/${jobs.jobs.length}`)
        }


    } else {
        console.log("There is no jobs.json created");
        console.log("Create a jobs.json file to run a download job as needed");
    }
}