"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("node:fs");
if (fs.existsSync("jobs.json")) {
}
else {
    console.log("There is no jobs.json created");
    console.log("Create a jobs.json file to run a download job as needed");
}
