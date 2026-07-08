import puppeteer from "puppeteer-core";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

async function exportPng(htmlFile, outputFile, width, height) {
  const browser = await puppeteer.launch({
    executablePath: "/usr/local/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: true,
  });

  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(`file://${path.join(root, htmlFile)}`, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => {
    const canvas = document.querySelector("#cpo-canvas");
    return canvas && canvas.width > 0;
  });

  const canvas = await page.$("#cpo-canvas");
  await canvas.screenshot({ path: path.join(root, outputFile), type: "png" });
  await browser.close();
  console.log(`Exported ${outputFile}`);
}

(async () => {
  await exportPng("canva/export.html", "canva/cpo-scheme-canvas.png", 1920, 1680);
  await exportPng("canva/export-2x.html", "canva/cpo-scheme-canvas-2x.png", 3840, 3360);
  await exportPng("canva/export-3x.html", "canva/cpo-scheme-canvas-3x.png", 5760, 5040);
  await exportPng("index.html", "canva/cpo-scheme.png", 1920, 1800);
})();
