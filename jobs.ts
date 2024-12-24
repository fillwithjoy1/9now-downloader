import {browser_mass_download, browser_scan_download, Lock} from "./functions";
import * as fs from "node:fs";

// High-Performance mode requires significant amounts of RAM, CPU and Network
// Instead of running one job at a time, all jobs are dispatched
const high_performance: boolean = false;
// Controls how many tasks are sent
const hp_tasks = 3;

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
        if (high_performance) {
            console.log(`⏲️ High Performance Mode is on!`);
            await Lock.lock();
            const allTheJobs = jobs.jobs.map(individualJob => dispatch_job(individualJob));

            await Promise.all(allTheJobs).then().catch(console.error);
            Lock.unlock();
        } else {
            for (let i = 0; i < jobs.jobs.length; i++) {
                await dispatch_job(jobs.jobs[i]);
            }
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
        } else {
            console.log(`⚒️ Starting job ${job.name}`);
            if (!job.scan) {
                await browser_mass_download(job.link, job.folder_name, job.length, high_performance);
            } else if (job.scan === true) {
                await browser_scan_download(job.link, job.folder_name, high_performance);
            }
            console.log(`✅ Finished job successfully: ${job.name}`);
        }
        resolve();
    });
}