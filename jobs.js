"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var functions_1 = require("./functions");
var fs = require("node:fs");
if (fs.existsSync("jobs.json")) {
    fs.readFile("jobs.json", "utf8", function (err, data) {
        console.log("📖 Reading jobs.json file");
        if (err) {
            console.error(err);
        }
        var jobs = JSON.parse(data);
        console.log("\uD83D\uDCA1 Found ".concat(jobs.jobs.length, " jobs to do"));
        for (var i = 0; i < jobs.jobs.length; i++) {
            if (jobs.jobs[i].skip) {
                console.log("\uD83E\uDD98 Skipping job ".concat(jobs.jobs[i].name));
                continue;
            }
            console.log("\u2692\uFE0F Starting job ".concat(jobs.jobs[i].name));
            (0, functions_1.browser_mass_download)(jobs.jobs[i].link, jobs.jobs[i].folder_name, jobs.jobs[i].length);
            console.log("\u2705 Finished job successfully, ".concat(i + 1, "/").concat(jobs.jobs.length));
        }
    });
}
else {
    console.log("There is no jobs.json created");
    console.log("Create a jobs.json file to run a download job as needed");
}
