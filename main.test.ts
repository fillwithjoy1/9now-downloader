import {Browser, Lock, sleep} from "./functions.js";
import {expect, test} from "vitest";
import * as fs from "node:fs/promises";
import {existsSync} from "node:fs"

// TODO: Add cohesive testing before reworking the files
// TODO: Add a valid page to check 404 detection works
test("404 Page Check", async () => {
    const browser = await Browser.create(true);

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