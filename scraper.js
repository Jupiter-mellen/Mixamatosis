const puppeteer = require('puppeteer');

async function scrapeEvent(url) {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  // Set a human-like user agent
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
  );
  await page.setViewport({ width: 1366, height: 768 });

  let retries = 3;
  let success = false;
  let eventLinks = []; // Array to store event links

  while (retries > 0 && !success) {
    try {
      // Go to the URL with a delay
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 0 });

      // Add delay to mimic human-like behavior
      await page.waitForTimeout(2000);

      // Check if CAPTCHA element exists
      const captchaElement = await page.$('.g-recaptcha');
      if (captchaElement) {
        console.log('CAPTCHA found. Please solve the CAPTCHA to proceed.');
        await browser.close();
        return eventLinks;
      }


      // Get the links of all the events
      eventLinks = await page.$$eval(
        'span[data-test-id="event-listing-heading"]',
        (links) => links.map((link) => new URL(link.getAttribute('href'), window.location.href).href)
      );

      success = true;
    } catch (error) {
      console.log(`An error occurred while navigating to ${url}`);
      console.log(`Retries remaining: ${retries}`);

      // Wait for some time before retrying
      await page.waitForTimeout(3000);

      retries--;
    }
  }

  await browser.close();
  if (eventLinks.length === 0) {
    console.log("Link scraping failed. No event links found.");
    return eventLinks;
  }
  else {
    console.log(`Event-link[s] saved ${eventLinks}`);
    return eventLinks;
  }
  

}

module.exports = scrapeEvent;

