const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--window-size=1440,900']
  });

  const pages = ['/', '/shop', '/categories', '/new-arrivals', '/blog'];
  const outDir = 'C:/Users/hp/.gemini/antigravity/brain/092086fb-c000-4c8b-9c83-0c5beef578e4';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  for (const p of pages) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

    await page.goto('http://localhost:5001' + p, { waitUntil: 'networkidle0', timeout: 20000 });
    await sleep(2000);

    const info = await page.evaluate(() => {
      const drawer = document.getElementById('footer-info-drawer');
      const body = document.body;
      const navbar = document.querySelector('.main-site-navbar');
      const hero = document.querySelector('.hero-section');
      return {
        drawerActive: drawer ? drawer.classList.contains('active') : 'no-drawer',
        bodyWidth: body.offsetWidth,
        navbarWidth: navbar ? navbar.offsetWidth : 0,
        heroWidth: hero ? hero.offsetWidth : 0,
        bodyClass: body.className,
        pageTitle: document.title
      };
    });

    const filename = outDir + '/ss_' + p.replace(/\//g, '_') + '.png';
    await page.screenshot({ path: filename, fullPage: true });
    console.log(`Saved screenshot for ${p} -> ${filename}`);
    await page.close();
  }

  await browser.close();
  
})();
