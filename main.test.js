import {Browser} from "./functions.js";
import {expect, test} from "vitest";

// TODO: Add cohesive testing before reworking the files
test("404 Page Check", async () => {
    const browser = await Browser.create();

    const page = await browser.browser.newPage();

    await page.goto("https://www.9now.com.au/archery-olympic-games-paris-2024/season-2025/", browser.noTimeout);

    console.log(await browser.check404(page));

    expect(await browser.check404(page)).toBeTruthy();
}, 30000);