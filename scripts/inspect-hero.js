const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true, args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5001/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  
  const info = await page.evaluate(() => {
    const hero = document.querySelector('.hero-section');
    const heroBg = document.querySelector('.hero-bg-media');
    const img = heroBg ? heroBg.querySelector('img, video') : null;
    return {
      heroW: hero ? hero.offsetWidth : 0,
      heroH: hero ? hero.offsetHeight : 0,
      heroBgW: heroBg ? heroBg.offsetWidth : 0,
      heroBgH: heroBg ? heroBg.offsetHeight : 0,
      imgW: img ? img.offsetWidth : 0,
      imgH: img ? img.offsetHeight : 0,
      imgSrc: img ? img.src || img.currentSrc : 'none',
      bodyW: document.body.offsetWidth,
      htmlW: document.documentElement.offsetWidth,
      heroComputedWidth: hero ? window.getComputedStyle(hero).width : 'n/a',
      heroComputedMaxWidth: hero ? window.getComputedStyle(hero).maxWidth : 'n/a',
    };
  });
  await browser.close();
})();
