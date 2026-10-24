// Screenshots of test/preview.html in a few states. Run inside the Playwright image:
//   docker run --rm -v "$PWD":/w -w /w mcr.microsoft.com/playwright:v1.49.1-noble \
//     sh -c 'npm i -s playwright@1.49.1 >/dev/null && node test/shots.js'
const { chromium } = require("playwright");

const SHOTS = [
  ["heat", "light", 760], ["hw", "light", 760], ["stop", "light", 760], ["idle", "dark", 760],
  ["heat", "light", 380], ["hw", "dark", 380], ["heat&detail=1", "light", 760],
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 800, height: 900 }, deviceScaleFactor: 1.5 });
  for (const [mode, theme, width] of SHOTS) {
    await page.goto(`file://${__dirname}/preview.html?mode=${mode}&theme=${theme}&width=${width}`);
    const el = await page.$("#host");
    const name = `${mode.replace("&detail=1", "-detail")}-${theme}-${width}`;
    await el.screenshot({ path: `images/${name}.png` });
    console.log(name);
  }
  await browser.close();
})();
