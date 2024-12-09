import {browser_mass_download} from "./functions";
import * as fs from "node:fs";

// Defining Types in TS

interface Job {
    name: string;
    link: string;
    length: number;
    folder_name: string;
    skip?: boolean;
}

interface JobSchema {
    jobs: Job[];
}

if (fs.existsSync("jobs.json")) {
    fs.readFile("jobs.json", "utf8", (err, data): void => {
        console.log("📖 Reading jobs.json file")
        if (err) {
            console.error(err);
        }
        const jobs: JobSchema = JSON.parse(data);
        console.log(`💡 Found ${jobs.jobs.length} jobs to do`);
        for (let i = 0; i < jobs.jobs.length; i++) {
            if (jobs.jobs[i].skip) {
                console.log(`🦘 Skipping job ${jobs.jobs[i].name}`)
                continue;
            }
            console.log(`⚒️ Starting job ${jobs.jobs[i].name}`);
            browser_mass_download(jobs.jobs[i].link, jobs.jobs[i].folder_name, jobs.jobs[i].length);
            console.log(`✅ Finished job successfully, ${i + 1}/${jobs.jobs.length}`)
        }
    });
} else {
    console.log("There is no jobs.json created");
    console.log("Create a jobs.json file to run a download job as needed");
}