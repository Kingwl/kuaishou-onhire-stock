import * as pug from "pug";
import * as path from "path";
import * as fs from "fs-extra";

import { fetchAndCalc } from "./calc";
const templatePath = path.resolve(__dirname, "../static/template.pug");
const distPath = path.resolve(__dirname, "../out");
const distFilePath = path.join(distPath, "index.html");

async function main() {
    const { current, next, currency, now } = await fetchAndCalc();

    const htmlContent = pug.renderFile(templatePath, {
        current,
        next,
        currency,
        now
    });

    await fs.ensureDir(distPath);
    await fs.writeFile(distFilePath, htmlContent);
}

main()
    .then(() => {
        console.log("Done");
    })
    .catch(err => {
        console.log("Failed: " + err);
    });
