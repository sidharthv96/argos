import puppeteer from "puppeteer";

import { job as buildJob } from "@argos-ci/build";
import config from "@argos-ci/config";
import { raw, transaction } from "@argos-ci/database";
import {
  Capture,
  Screenshot,
  ScreenshotBucket,
} from "@argos-ci/database/models";
import { insertFilesAndScreenshots } from "@argos-ci/database/services/screenshots";
import { createModelJob } from "@argos-ci/job-core";
import { S3ImageFile, s3 } from "@argos-ci/storage";

import { argosScreenshot } from "./argosScreenshot.js";

let browser: Promise<puppeteer.Browser> | null = null;

const launchBrowser = async () => {
  if (browser) {
    return browser;
  }

  browser = puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  return browser;
};

// const closeBrowser = async () => {
//   if (browser) {
//     await (await browser).close();
//   }
// };

const captureScreenshot = async (url: string) => {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setViewport({
    width: 1280,
    height: 1024,
    deviceScaleFactor: 2,
  });
  await page.goto(url, {
    waitUntil: "networkidle2",
  });
  const buffer = await argosScreenshot(page);
  await page.close();
  return buffer;
};

export const performCapture = async (capture: Capture) => {
  const buffer = await captureScreenshot(capture.url);
  const image = new S3ImageFile({
    s3: s3(),
    bucket: config.get("s3.screenshotsBucket"),
    buffer,
    contentType: "image/png",
  });
  const key = await image.upload();
  const crawl = await capture.$relatedQuery("crawl");
  const build = await crawl.$relatedQuery("build");
  await transaction(async (trx) => {
    await insertFilesAndScreenshots({
      screenshots: [
        {
          key,
          name: "/",
        },
      ],
      build,
      trx,
    });
    await Capture.query(trx)
      .patch({ jobStatus: "complete" })
      .where("id", capture.id);
  });

  const { complete } = (await Capture.query()
    .select(raw(`bool_and("jobStatus" = 'complete') as complete`))
    .where("crawlId", crawl.id)
    .first()) as unknown as {
    complete: boolean;
  };

  if (complete) {
    const screenshotCount = await Screenshot.query()
      .where("screenshotBucketId", build.compareScreenshotBucketId)
      .resultSize();
    await ScreenshotBucket.query()
      .findById(build.compareScreenshotBucketId)
      .patch({
        screenshotCount,
        complete: true,
      });
    buildJob.push(build.id);
  }
};

// process.on("SIGTERM", () => {
//   callbackify(closeBrowser)((err: any) => {
//     if (err) throw err;
//   });
// });

export const job = createModelJob("capture", Capture, performCapture);
