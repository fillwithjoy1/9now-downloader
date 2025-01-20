// What does this file do? Well it contains functions that are used in jobs.ts
// Why? Because calling functions from there wakes up rl.question and that's not good

import puppeteer, {Browser, HTTPRequest, Page} from "puppeteer";
import {exec} from "node:child_process";
import * as fs from "fs";

// Credentials manager
let email: string = "";
let password: string = "";
if (fs.existsSync("password")) {
    fs.readFile("password", "utf8", (err: NodeJS.ErrnoException, data: string): void => {
        if (err) {
            console.error(err);
        }
        email = data.split("\r\n")[0];
        password = data.split("\r\n")[1];
    });
}

type logger = "none" | "info" | "debug";
let logging: logger;
// Flag which can be used to enable debug mode
logging = "info";

interface VideoInfo {
    videoUrl: string;
    licenseUrl: string;
    title: string;
    imageUrl: string;
}

// Internal function that enables logging to console if enabled
function log(data: string, type: logger): void {
    switch (type) {
        case "debug":
            if (logging === "debug") console.log(data);
            break;
        case "info":
            if (logging !== "none") console.log(data);
            break;
    }
}

export async function browser_mass_download(playlist_url: string, folder_output: string, length: number, high_performance = false): Promise<void> {
    const browser: PuppeteerBrowser = await PuppeteerBrowser.create();
    const download_links: VideoInfo[] = [];
    if (!high_performance) await Lock.lock();
    for (let i: number = 1; i <= length; i++) {
        download_links.push(await browser.downloadSingleVideo(`${playlist_url}/episode-${i}`));
        log("🔗 Fetched links", "info");
    }
    browser.close().then();
    log("⬇️ Starting download", "info");
    for (let i: number = 0; i < download_links.length; i++) {
        await python_download_video(download_links[i]["videoUrl"], download_links[i]["licenseUrl"], folder_output, `Ep ${i + 1} - ${download_links[i]["title"]}`, download_links[i]["imageUrl"]);
    }
    if (!high_performance) Lock.unlock();
}

export async function browser_scan_download(playlist_url: string, folder_output: string, high_performance = false) {
    const browser: PuppeteerBrowser = await PuppeteerBrowser.create();
    if (!high_performance) await Lock.lock();
    const scanned_links = await browser.scanForVideos(playlist_url);
    const download_links: VideoInfo[] = [];
    log("🛰️ Scanned for links", "info");
    for (let i = 0; i <= scanned_links.length; i++) {
        download_links.push(await browser.downloadSingleVideo(scanned_links[i]));
        log("🔗 Fetched links", "info");
    }
    log("⬇️ Starting download", "info");
    for (let i = 0; i < download_links.length; i++) {
        await python_download_video(download_links[i]["videoUrl"], download_links[i]["licenseUrl"], folder_output, download_links[i]["title"], download_links[i]["imageUrl"]);
    }
    if (!high_performance) Lock.unlock();
}

// TODO: Privatise some functions, if possible
// TODO: await page.close() doesn't do anything - this is a Firefox issue
export class PuppeteerBrowser {
    // Stop the no timeout errors
    private readonly noTimeout: { timeout: number } = {
        timeout: 0,
    };
    private browser: Browser;
    private page: Page;
    private autoRestart: NodeJS.Timeout;
    private autoSkip: NodeJS.Timeout;
    private videoUrl: string;
    private licenseUrl: string;
    private imageUrl: string;
    private title: string;
    private listenForDRMLinks: (request: HTTPRequest) => Promise<void>;
    private listenForLinks: (request: HTTPRequest) => Promise<void>;

    // This function is used to create the new object that is returned
    static async create(): Promise<PuppeteerBrowser> {
        const browserInstance = new this();
        await browserInstance.launch();
        return browserInstance;
    }

    // Creates a new browser and logs in automatically
    // This function should never be called at all as it's already called using constructor
    async launch(): Promise<void> {
        // TODO: Add flag that controls whether Chrome or Firefox can be used
        this.browser = await puppeteer.launch({
            channel: 'chrome',
            headless: false,
            ignoreDefaultArgs: [
                '--disable-component-update'
            ]
        });
        this.page = await this.browser.newPage();
        await this.login();
    }

    // Logs into 9Now
    login(): Promise<void> {
        return new Promise(async resolve => {
            await this.page.goto('https://login.nine.com.au/login?client_id=9now-web', this.noTimeout);

            await this.page.type('#input_email', email);

            await this.page.click('button[type="submit"]');

            await this.page.waitForNavigation(this.noTimeout);

            await this.page.type('#input_password', password);

            await this.page.click('button[type="submit"]');

            log("👤 Logged in!", "info")

            resolve();
        });
    }

    // Goes to specified link and returns the download video link and license URL required
    // Returns 0 for the license_url, if it's a non-drm video
    async downloadSingleVideo(website_url: string): Promise<VideoInfo> {
        return new Promise(async resolve  => {

            const page: Page = await this.browser.newPage();

            await this.safelyWait(page);
            await page.goto(website_url, this.noTimeout);

            if (await this.check404(page)) {
                // FIXME: Handle zero "0" string
                // FIXME: Migrate to objects
                resolve({videoUrl: "0", imageUrl: "0", licenseUrl: "0", title: "0"});
                return;
            }

            await page.waitForSelector('video', this.noTimeout);
            const drmStatus = await this.checkDRMStatus(page);
            log(String(drmStatus), "debug");

            // Reload page if download task didn't finish after 60 seconds
            this.autoRestart = setInterval(async () => {
                log("♻️ Reloading page", "info");
                await this.safelyWait(page);
                await page.reload(this.noTimeout);
            }, 60000);

            // If the download task didn't finish after 5 minutes, skip
            this.autoSkip = setTimeout(async () => {
                log("🕒 Timed out, skipping", "info");
                await this.safelyWait(page);
                await page.close();
                // FIXME: reject();
                resolve({videoUrl: "0", imageUrl: "0", licenseUrl: "0", title: "0"});
            }, 290000);

            this.videoUrl = '';
            this.licenseUrl = '';
            this.imageUrl = '';
            // TODO: This doesn't account for the title being completely empty
            this.title = await this.fetchTitle(page);

            // TODO: Merge both functions
            this.listenForDRMLinks = async request => {
                if (request.url().includes("manifest.mpd") && this.videoUrl === '' && !request.url().includes("brightcove") && !request.url().includes("infinity")) {
                    this.videoUrl = request.url();
                    log("Fetch video", "debug");
                    log(request.url(), "debug");
                    await exitFunction(page);
                }

                if (request.url().includes("license") && request.url().includes("debug")) {
                    this.licenseUrl = request.url();
                    log("Fetch License", "debug");
                    log(this.licenseUrl, "debug");
                    await exitFunction(page);
                }

                if (request.url().includes("image.jpg")) {
                    this.imageUrl = request.url();
                    log("Fetch image", "debug");
                    log(this.imageUrl, "debug");
                    await exitFunction(page);
                }
            }

            this.listenForLinks = async request => {
                if (request.url().includes("image.jpg")) {
                    this.imageUrl = request.url();
                    log("Fetch image", "debug");
                    log(this.imageUrl, "debug");
                    await exitFunction(page);
                }

                if (request.url().includes("master.m3u8") && !request.url().includes("brightcove")) {
                    this.videoUrl = request.url();
                    log("Fetch video", "debug");
                    log(request.url(), "debug");
                    await exitFunction(page);
                }
            }

            let exitFunction = async (page: Page) => {
                if (drmStatus) {
                    if (this.videoUrl.length > 0 && this.licenseUrl.length > 0 && this.imageUrl.length > 0) {
                        clearInterval(this.autoRestart);
                        clearTimeout(this.autoSkip);
                        page.off("request", request => this.listenForDRMLinks(request));
                        await this.safelyWait(page);
                        await page.close();
                        resolve({
                            videoUrl: this.videoUrl, licenseUrl: this.licenseUrl, imageUrl: this.imageUrl,
                            title: this.title
                        });
                    }
                } else {
                    if (this.videoUrl.length > 0 && this.imageUrl.length > 0) {
                        clearTimeout(this.autoRestart);
                        clearTimeout(this.autoSkip);
                        page.off("request", request => this.listenForLinks(request));
                        await this.safelyWait(page);
                        await page.close();
                        resolve({
                            videoUrl: this.videoUrl, title: this.title, imageUrl: this.imageUrl, licenseUrl: "0"
                        });
                    }
                }
            }

            page.on("request", request => {
                if (drmStatus) this.listenForDRMLinks(request);
                else this.listenForLinks(request);
            });
        });
    }

    // Returns an array of links
    // TODO: Create a type that is compatible with all functions
    async scanForVideos(website_url: string): Promise<string[]> {
        return new Promise(async resolve => {
            const page: Page = await this.browser.newPage();

            await page.goto(website_url, this.noTimeout);

            await this.autoScroll(page);

            resolve(page.$$eval('.GX-Ppj', (a: HTMLAnchorElement[]) => {
                return a.map(a => a.href);
            }));

            await this.safelyWait(page);
            await page.close();
        });
    }

    async fetchTitle(page: Page): Promise<string> {
        return await page.$eval('._3JyyHX', t => t.innerHTML);
    }

    async check404(page: Page): Promise<boolean> {
        return (await page.title() === "Page not found");
    }

    // FIXME: Might need to be improved upon later
    async checkDRMStatus(page: Page): Promise<boolean> {
        const videoElement = await page.$eval('video', e => {
            return e.getAttribute('data-param-video-asset');
        });
        if (videoElement) {
            return JSON.parse(videoElement)["video"]["drm"]
        } else {
            throw new Error("Failed to fetch video element")
        }
    }

    async autoScroll(page: Page): Promise<void> {
        return new Promise(async resolve => {
            setTimeout(() => {
                clearInterval(timer);
                resolve();
            }, 30000);

            let timer: NodeJS.Timeout = setInterval(() => {
            }, 10000);

            await page.evaluate(async (): Promise<void> => {
                timer = setInterval(() => {
                    window.scrollBy(0, 1000);
                }, 1000);
            });
        });
    }

    async safelyWait(page: Page): Promise<void> {
        while (page.mainFrame().detached) {
            await sleep(100);
        }
    }

    async close(): Promise<void> {
        // FIXME: Disabled these functions for the time being
        // await this.browser.disconnect();
        await this.browser.close();
    }
}

// FIXME: Find a better way to deal with the extreme variable requirements that is also typescript compliant
export function python_download_video(video_url: string, license_url: string, folder_output = "output", file_name: string, image_url: string) {
    return new Promise<void>(resolve => {
        const command = `python main.py --video_url="${video_url}" --license_url="${license_url}" --output="${folder_output}" --file_name="${file_name}" --image_url="${image_url}"`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(error);
            }

            if (stderr) {
                console.error(stderr);
            }
            log(stdout, "debug");
            resolve();
        })
    });
}

export class Lock {
    static status() {
        return fs.existsSync("node.lock");
    }

    static lock() {
        return new Promise<void>(async resolve => {
            if (this.status()) console.warn("🔒 Lock is active");
            while (this.status()) {
                await sleep(3000);
            }
            fs.writeFileSync("node.lock", "");
            resolve();
        });
    }

    static unlock() {
        try {
            fs.unlinkSync("node.lock");
        } catch (e) {
            console.warn(e);
        }
    }
}

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}