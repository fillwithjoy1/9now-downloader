import * as fs from "node:fs";

// Defining Types in TS

interface Job {
    name: string;
    link: string;
    length: number;
    folder_name: string;
    skip?: boolean;
}

interface JobSchema {
    jobs: Job[];
}

if (fs.existsSync("jobs.json")) {

} else {
    console.log("There is no jobs.json created");
    console.log("Create a jobs.json file to run a download job as needed");
}