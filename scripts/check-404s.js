const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true, args: ['--no-sandbox']
  });
  
  const urls = ['/', '/shop', '/categories', '/blog'];
  
  for (const u of urls) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    
    const errors404 = [];
    const consoleErrors = [];
    
    page.on('response', res => {
      if (res.status() === 404) errors404.push(res.url());
    });
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text().substring(0, 150));
    });
    
    await page.goto('http://localhost:5001' + u, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 1000));
    
    
    await page.close();
  }
  await browser.close();
})();
