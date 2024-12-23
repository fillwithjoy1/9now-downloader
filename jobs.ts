import {browser_mass_download, browser_scan_download} from "./functions";
import * as fs from "node:fs";

// High-Performance mode requires significant amounts of RAM, CPU and Network
// Instead of running one job at a time, all jobs are dispatched
const high_performance: Boolean = false;

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
                await browser_scan_download(jobs.jobs[i].link, jobs.jobs[i].folder_name);
            }
            console.log(`✅ Finished job successfully, ${i + 1}/${jobs.jobs.length}`)
        }


    } else {
        console.log("There is no jobs.json created");
        console.log("Create a jobs.json file to run a download job as needed");
    }
}

async function dispatch_job(job: Job): Promise<void> {
    return new Promise(async resolve => {
        if (job.skip === true) {
            console.log(`🦘 Skipping job ${job.name}`);
        }
        console.log(`⚒️ Starting job ${job.name}`);
        if (!job.scan) {
            await browser_mass_download(job.link, job.folder_name, job.length);
        } else if (job.scan === true) {
            await browser_scan_download(job.link, job.folder_name);
        }
        console.log(`✅ Finished job successfully: ${job.name}`);
        resolve();
    });
}