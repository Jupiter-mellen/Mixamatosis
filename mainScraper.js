const scrapeEvent = require('./scraper');
const puppeteer = require('puppeteer');
const fs = require('fs');
const axios = require('axios');
const path = require('path');

async function scrapeAndSaveEventDetails(eventLink, folderName) {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  // Set a human-like user agent
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
  );
  await page.setViewport({ width: 1366, height: 768 });

  let retries = 3;
  let success = false;

  while (retries > 0 && !success) {
    try {
      // Go to the event page with a delay
      await page.goto(eventLink, { waitUntil: 'networkidle2', timeout: 0 });

      // Add delay to mimic human-like behavior
      await page.waitForTimeout(2000);

      // Extract event title
      const titleElement = await page.$('span.Text-sc-1t0gn2o-0.kaSbtQ');
      const title = titleElement ? await page.evaluate((element) => element.textContent, titleElement) : '';

      // Extract date and time div
      const dateTimeElementXPath = await page.$x('//*[@id="__next"]/div[2]/header/div/div[2]/div[2]/div/ul/li[2]/div/div[2]');
      const dateTimeHTML = dateTimeElementXPath.length > 0 ? await page.evaluate((element) => element.innerHTML, dateTimeElementXPath[0]) : '';

      // Extract date from the div
      const dateElement = await page.$('a.Link__AnchorWrapper-k7o46r-1.hPUJuC span.Text-sc-1t0gn2o-0.Link__StyledLink-k7o46r-0.dnlnmy', { html: dateTimeHTML });
      const date = dateElement ? await page.evaluate((element) => element.textContent.trim(), dateElement) : '';

      // Extract time from the div
      const timeElement = await page.$('div.Box-omzyfs-0.fLfEte span.Text-sc-1t0gn2o-0.esJZBM', { html: dateTimeHTML });
      const time = timeElement ? await page.evaluate((element) => element.textContent.trim(), timeElement) : '';

      // Extract venue name and location from the HTML element
      const venueElement = await page.$('div.Box-omzyfs-0.Alignment-sc-1fjm9oq-0.gNjGdd');
      const venueName = await page.evaluate((element) => {
        const nameElement = element.querySelector('a.Link__AnchorWrapper-k7o46r-1.hPUJuC span.Text-sc-1t0gn2o-0.Link__StyledLink-k7o46r-0.dnlnmy');
        return nameElement ? nameElement.textContent.trim() : '';
      }, venueElement);

      const venueLocation = await page.evaluate((element) => {
        const locationElement = element.querySelector('ul.Grid__GridStyled-sc-1l00ugd-0.itbbwg.grid li.Column-sc-18hsrnn-0.eOmuPi span.Text-sc-1t0gn2o-0.esJZBM');
        return locationElement ? locationElement.textContent.trim() : '';
      }, venueElement);

      // Combine venue name and location
      const venue = `${venueName}\n${venueLocation}`;

      // Extract poster image URL
      const posterImageElement = await page.$('img.Image-y331ct-0.lfjdse');
      const posterImageURL = posterImageElement ? await page.evaluate((element) => element.getAttribute('src'), posterImageElement) : '';

      // Save event details to a text file
      const text = `Title: ${title}\nDate: ${date}\nTime: ${time}\nVenue: ${venue}`;
      const eventDetailsPath = path.join(folderName, 'event_details.txt');
      fs.writeFileSync(eventDetailsPath, text);
      console.log(`Event details saved: ${eventDetailsPath}`);

      // Download and save the poster image
      const imageResponse = await axios.get(posterImageURL, { responseType: 'stream' });
      const imagePath = path.join(folderName, 'poster.jpg');
      const imageStream = fs.createWriteStream(imagePath);
      imageResponse.data.pipe(imageStream);
      await new Promise((resolve, reject) => {
        imageStream.on('finish', resolve);
        imageStream.on('error', reject);
      });

      console.log(`Event details and image saved for event: ${folderName}`);

      success = true;
    } catch (error) {
      console.log(`An error occurred while scraping the event page: ${eventLink}`);
      console.log(`Retries remaining: ${retries}`);
      console.error(error);

      // Wait for some time before retrying
      await page.waitForTimeout(3000);

      retries--;
    }
  }

  await browser.close();
}

async function main() {

  const upcomingEventLinks = await scrapeEvent('https://ra.co/promoters/105908/events');
  const pastEventLinks = await scrapeEvent('https://ra.co/promoters/105908/past-events');

  if (upcomingEventLinks.length === 0 && pastEventLinks.length === 0) {
    console.log('Scrape failed');
  } else {
    // Delete upcoming_events folder and its contents
    fs.rmSync('upcoming_events', { recursive: true, force: true });

    // Delete past_events folder and its contents
    fs.rmSync('past_events', { recursive: true, force: true });

    const upcomingEventsFolder = 'upcoming_events';
    const pastEventsFolder = 'past_events';

    // Create folders for upcoming events and past events
    fs.mkdirSync(upcomingEventsFolder, { recursive: true });
    fs.mkdirSync(pastEventsFolder, { recursive: true });

    // Scrape and save details for upcoming events
    for (let i = 0; i < upcomingEventLinks.length; i++) {
      const folderName = path.join(upcomingEventsFolder, `event${i + 1}`);
      fs.mkdirSync(folderName, { recursive: true });
      await scrapeAndSaveEventDetails(upcomingEventLinks[i], folderName);
    }

    // Scrape and save details for past events
    for (let i = 0; i < pastEventLinks.length; i++) {
      const folderName = path.join(pastEventsFolder, `event${i + 1}`);
      fs.mkdirSync(folderName, { recursive: true });
      await scrapeAndSaveEventDetails(pastEventLinks[i], folderName);
    }

  }

}

main().catch((error) => console.error(error));
