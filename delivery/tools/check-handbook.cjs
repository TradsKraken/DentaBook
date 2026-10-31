const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const root = path.resolve(process.argv[2]);
  const output = path.resolve(process.argv[3]);
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('file://' + root + '/CLIENT_GUIDE.html');
    const diagrams = page.locator('.diagram img');
    assert.equal(await diagrams.count(), 14);
    assert.equal(await diagrams.evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)), true);
    for (const width of [390, 320, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'handbook overflow at ' + width);
      for (const link of await page.locator('nav a').all()) {
        const box = await link.boundingBox();
        assert.ok(box.width >= 44 && box.height >= 44, 'navigation target at ' + width);
      }
      if (width <= 390) {
        assert.ok(await page.locator('.diagram-viewport').evaluateAll(regions => regions.filter(region => region.scrollWidth > region.clientWidth).length) >= 8, 'phone diagrams should scroll in their own region');
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.diagram').first().screenshot({ path: path.join(output, 'handbook-phone-diagram.png') });
    await page.emulateMedia({ media: 'print' });
    await page.setViewportSize({ width: 680, height: 1000 });
    const scales = await diagrams.evaluateAll(images => images.map(image => {
      const name = image.getAttribute('src');
      const box = image.getBoundingClientRect();
      return { name, width: box.width, height: box.height, nativeWidth: image.naturalWidth, nativeHeight: image.naturalHeight, approximateTextPixels: 16 * Math.min(box.width / image.naturalWidth, box.height / image.naturalHeight) };
    }));
    for (const scale of scales) {
      assert.ok(scale.width <= 681 && scale.height <= 681, 'print diagram bounds ' + scale.name);
      assert.ok(scale.approximateTextPixels >= 11, 'print diagram text too small ' + scale.name);
    }
    await page.pdf({ path: path.join(root, 'CLIENT_GUIDE.pdf'), format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="width:100%;font-size:9px;color:#526e80;text-align:center">DentaBook · Client Handbook · <span class="pageNumber"></span> / <span class="totalPages"></span></div>', margin: { top: '15mm', bottom: '18mm', left: '15mm', right: '15mm' } });
    await page.emulateMedia({ media: 'screen' });
    await page.setViewportSize({ width: 1100, height: 1300 });
    for (const name of ['01-system-architecture', '04-administrator-review', '06-core-data-relationships', '07-appointment-data-relationships', '08-planned-booking-workflow']) {
      await page.goto('file://' + root + '/docs/diagrams/' + name + '.svg');
      assert.equal(await page.locator('svg').count(), 1, name);
      if (name.includes('data-relationships')) {
        for (const rect of await page.locator('.edgeLabel rect.background').all()) {
          assert.equal(await rect.evaluate(element => getComputedStyle(element).fill), 'rgb(255, 255, 255)', 'relationship label background');
        }
        for (const text of await page.locator('.edgeLabel text').all()) {
          assert.equal(await text.evaluate(element => getComputedStyle(element).fill), 'rgb(23, 55, 75)', 'relationship label contrast');
        }
      }
      await page.locator('svg').screenshot({ path: path.join(output, name + '.png') });
    }
    assert.deepEqual(errors, []);
    const report = { diagramSources: 12, embeddedDiagrams: 14, handbookWidths: [390, 320, 768, 1440], phoneScrolling: 'contained', printSizing: 'passed', renderedImageErrors: 0, printScales: scales };
    fs.writeFileSync(path.join(output, 'diagram-verification.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ diagramSources: report.diagramSources, embeddedDiagrams: report.embeddedDiagrams, widths: report.handbookWidths, phoneScrolling: report.phoneScrolling, printSizing: report.printSizing, errors: errors.length, pdf: 'regenerated' }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
