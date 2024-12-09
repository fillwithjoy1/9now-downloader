"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var functions_1 = require("./functions");
var fs = require("node:fs");
if (fs.existsSync("jobs.json")) {
    fs.readFile("jobs.json", "utf8", function (err, data) {
        if (err) {
            console.error(err);
        }
        var jobs = JSON.parse(data);
        for (var i = 0; i < jobs.jobs.length; i++) {
            if (jobs.jobs[i].skip) {
                continue;
            }
            (0, functions_1.browser_mass_download)(jobs.jobs[i].link, jobs.jobs[i].folder_name, jobs.jobs[i].length);
        }
    });
}
else {
    console.log("There is no jobs.json created");
    console.log("Create a jobs.json file to run a download job as needed");
}
