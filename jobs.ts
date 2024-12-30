// FIXME: too many imports lol
import {browser_mass_download, browser_scan_download, Lock, sleep, Browser, python_download_video} from "./functions";
import * as fs from "node:fs";

// 🏳️ FLAGS
// High-Performance mode requires significant amounts of RAM, CPU and Network
// Instead of running one job at a time, all jobs are dispatched
const high_performance: boolean = false;
// Controls how many tasks are sent
const hp_tasks = 3;
const include_clips: boolean = false;
// 🚨 DRAMATICALLY IMPROVES RELIABILITY 🚨
// Writes each individual link to a file that is then processed for download
const write_to_file: boolean = true;

// Define job types in TS
export interface Job {
    name: string;
    link: string;
    length: number;
    folder_name: string;
    skip?: boolean;
    scan?: boolean;
}

export interface JobSchema {
    jobs: Job[];
}

export interface JobLink {
    jobs: VideoInfo[]
}

export interface VideoInfo {
    video_link: string;
    license_url: string;
    file_name: string;
    image_url: string;
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
            const allTheJobs = jobs.jobs.map(individualJob => dispatchJob(individualJob));

            await Promise.all(allTheJobs).then().catch(console.error);
            Lock.unlock();
        } else {
            for (let i = 0; i < jobs.jobs.length; i++) {
                if (write_to_file) {
                    await dispatchJobWithDisk(jobs.jobs[i], 'joblink.json');
                } else {
                    await dispatchJob(jobs.jobs[i]);
                }
            }
        }
    } else {
        console.log("There is no jobs.json created");
        console.log("Create a jobs.json file to run a download job as needed");
    }
}

async function dispatchJob(job: Job): Promise<void> {
    return new Promise(async resolve => {
        if (job.skip === true) {
            console.log(`🦘 Skipping job ${job.name}`);
        } else {
            console.log(`⚒️ Starting job ${job.name}`);
            if (!job.scan) {
                await browser_mass_download(job.link, job.folder_name, job.length, high_performance);
                if (include_clips) console.log("✂️ Downloading clips");
                if (include_clips) await browser_scan_download(`${job.link}/clips`, `${job.folder_name}_clips`, high_performance)
            } else if (job.scan === true) {
                await browser_scan_download(job.link, job.folder_name, high_performance);
            }
            markJobDone("jobs.json", job.name);
            console.log(`✅ Finished job successfully: ${job.name}`);
        }
        resolve();
    });
}

export function markJobDone(fileName: fs.PathOrFileDescriptor, jobName: Job["name"]): void {
    const data: string = fs.readFileSync(fileName).toString();
    const jobs: JobSchema = JSON.parse(data);
    const jobID: number = jobs.jobs.findIndex(individualJob => individualJob.name === jobName);
    jobs.jobs[jobID].skip = true;
    fs.writeFileSync(fileName, JSON.stringify(jobs));
}

// FIXME: Add clips support/merge with dispatchJob
// FIXME: Add support for high_performance
async function dispatchJobWithDisk(job: Job, fileName: string): Promise<void> {
    return new Promise(async resolve => {
        if (job.skip === true) {
            console.log(`🦘 Skipping job ${job.name}`);
        } else {
            if (!fs.existsSync(fileName)) await writeJobLinksFile(fileName);
            const data: JobLink = JSON.parse(fs.readFileSync(fileName).toString());
            const jobsWritten: number = data.jobs.length
            if (jobsWritten > 0) console.log(`💾 Found ${jobsWritten} links written to disk`);
            const browser = await Browser.create();
            const download_links: VideoInfo[] = data.jobs;
            await Lock.lock();
            for (let i = jobsWritten + 1; i <= job.length; i++) {
                download_links.push(await browser.downloadSingleVideo(`${job.link}/episode-${i}`));
                console.log("🔗 Fetched links");
                await saveJSONtoFile({'jobs': download_links} satisfies JobLink, "joblink.json");
            }
            browser.close();
            console.log("⬇️ Starting download");
            for (let i = 0; i < download_links.length; i++) {
                await python_download_video(download_links[i][0], download_links[i][1], job.folder_name, `Ep ${i + 1} - ${download_links[i][2]}`, download_links[i][3]);
            }
            await Lock.unlock();
            fs.unlink("joblink.json", err => err);
            markJobDone("jobs.json", job.name);
            console.log(`✅ Finished job successfully: ${job.name}`);
        }
        resolve();
    });
}

export async function saveJSONtoFile(json, fileName: string): Promise<void> {
    if (fs.existsSync(fileName)) fs.unlink(fileName, err => err);
    fs.writeFileSync(fileName, JSON.stringify(json));
}

export async function writeJobLinksFile(fileName: string) {
    const skeleton: JobLink = JSON.parse('{"jobs": []}')
    if (fs.existsSync(fileName)) fs.unlink(fileName, err => err);
    await sleep(10);
    fs.writeFileSync(fileName, JSON.stringify(skeleton));
}