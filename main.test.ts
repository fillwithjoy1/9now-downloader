import {Browser, Lock, sleep} from "./functions.js";
import {expect, test} from "vitest";
import * as fs from "node:fs/promises";
import {existsSync} from "node:fs";
import {JobLink, JobSchema, markJobDone, writeJobLinksFile} from "./jobs";

// TODO: Add cohesive testing before reworking the files
// TODO: Add a valid page to check 404 detection works
test("404 Page Check", async () => {
    const browser = await Browser.create();

    const page = await browser.browser.newPage();

    await page.goto("https://www.9now.com.au/archery-olympic-games-paris-2024/season-2025/", browser.noTimeout);

    console.log(await browser.check404(page));

    expect(await browser.check404(page)).toBeTruthy();
}, 60000);

// Test Lock class
test("Create a lock", async () => {
    if (existsSync("node.lock")) await fs.unlink("node.lock");
    await Lock.lock();
    expect(await fs.stat("node.lock")).toBeTruthy();
    await fs.unlink("node.lock");
});

test("Remove a lock", async () => {
    if (!existsSync("node.lock")) await Lock.lock();
    Lock.unlock();
    expect(existsSync("node.lock")).toBeFalsy();
})

test("Check Lock.status()", async () => {
    if (!existsSync("node.lock")) await Lock.lock();
    expect(Lock.status()).toBeTruthy();
});


// Check sleep function
test("Sleep function check", async () => {
    const now = performance.now();
    await sleep(3000);
    const now2 = performance.now();
    console.log(`Performance: ${now2 - now - 3000}`);
    expect(now2 - now > 2990).toBeTruthy();
});

// Write a new skeleton job.test.json file
async function writeNewJobsToDisk(): Promise<void> {
    const structure = JSON.parse('{"jobs": [{"name": "test", "folder_name": "test", "skip": false}]}');
    if (existsSync("jobs.test.json")) await fs.unlink("jobs.test.json");
    await fs.writeFile("jobs.test.json", JSON.stringify(structure));
}

// Tests an internal function
test("Write new jobs", async () => {
    await writeNewJobsToDisk();
    expect(existsSync("jobs.test.json")).toBeTruthy;
    await fs.unlink("jobs.test.json");
});

test("Check job properties", async () => {
    await writeNewJobsToDisk();
    const contents: JobSchema = JSON.parse(await fs.readFile("jobs.test.json") as unknown as string);
    expect(contents.jobs[0].name === "test").toBe(true);
    await fs.unlink("jobs.test.json");
});

test("Check marking job as done", async () => {
    await writeNewJobsToDisk();
    markJobDone("jobs.test.json", "test");
    const contents: JobSchema = JSON.parse(await fs.readFile("jobs.test.json") as unknown as string);
    expect(contents.jobs[0].skip).toBe(true);
    await fs.unlink("jobs.test.json");
});

test("Check joblink write ", async () => {
    await writeJobLinksFile('joblink.test.json');
    const contents: JobLink = JSON.parse(await fs.readFile("joblink.test.json") as unknown as string);
    expect(contents.jobs.length).toBe(0);
    await fs.unlink("joblink.test.json");
})