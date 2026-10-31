// Render reviewed Mermaid sources into portable SVG assets.
// Run in a Node environment with Playwright and Mermaid available.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(process.argv[2]);
const mermaidRoot = path.resolve(process.env.MERMAID_DIST || '/tmp/diagram-tools/node_modules/mermaid/dist');
(async () => {
  const server = http.createServer((req, res) => {
    const name = new URL(req.url, 'http://localhost').pathname;
    if (name === '/') { res.setHeader('Content-Type', 'text/html'); return res.end('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>'); }
    const file = path.resolve(mermaidRoot, '.' + name);
    if (!file.startsWith(mermaidRoot + path.sep)) { res.statusCode = 403; return res.end(); }
    try { res.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : 'application/javascript'); res.end(fs.readFileSync(file)); }
    catch { res.statusCode = 404; res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 1200 } });
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.addScriptTag({ type: 'module', content: 'import mermaid from "/mermaid.esm.min.mjs"; window.diagramMermaid = mermaid;' });
    await page.waitForFunction(() => window.diagramMermaid);
    await page.evaluate(() => window.diagramMermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'base', fontFamily: 'Arial, sans-serif', fontSize: 16, htmlLabels: false, themeCSS: '.edgeLabel rect.background{fill:#ffffff !important;opacity:1 !important}.edgeLabel text,.edgeLabel tspan{fill:#17374b !important}', themeVariables: { primaryColor: '#eaf5ff', primaryTextColor: '#17374b', primaryBorderColor: '#176d9b', lineColor: '#496e85', secondaryColor: '#ffffff', tertiaryColor: '#f2f7fb', edgeLabelBackground: '#ffffff', fontFamily: 'Arial, sans-serif', fontSize: '16px' }, flowchart: { htmlLabels: false, useMaxWidth: true, curve: 'linear', nodeSpacing: 24, rankSpacing: 22, padding: 8 }, sequence: { useMaxWidth: true, wrap: true, actorMargin: 60, messageMargin: 18 }, er: { useMaxWidth: true, fontSize: 16 } }));
    let count = 0;
    for (const file of fs.readdirSync(path.join(root, 'src')).filter(file => file.endsWith('.mmd')).sort()) {
      const source = fs.readFileSync(path.join(root, 'src', file), 'utf8');
      const result = await page.evaluate(async ({ source, id }) => {
        await window.diagramMermaid.parse(source);
        const { svg } = await window.diagramMermaid.render(id, source);
        const element = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
        const viewBox = element.getAttribute('viewBox');
        const size = viewBox.split(/\s+/).map(Number);
        element.setAttribute('width', String(size[2]));
        element.setAttribute('height', String(size[3]));
        return { svg: new XMLSerializer().serializeToString(element), viewBox };
      }, { source, id: 'dentabook-diagram-' + (++count) });
      if (result.svg.includes('Syntax error') || result.svg.includes('<script')) throw new Error('Invalid SVG: ' + file);
      fs.writeFileSync(path.join(root, file.replace('.mmd', '.svg')), result.svg);
      console.log(file + ' -> SVG ' + result.viewBox);
    }
    console.log('Rendered ' + count + ' diagrams.');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
