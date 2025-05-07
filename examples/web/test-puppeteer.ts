import puppeteer from 'puppeteer';

async function run() {
  // Start browser
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Go to the local Vite dev server (assume default port)
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

  // Click the extract button
  await page.click('#extract-btn');

  // Wait for the output to change from 'Extracting text...'
  await page.waitForFunction(() => {
    const el = document.getElementById('output');
    return el && el.textContent && !el.textContent.startsWith('Extracting text...');
  }, { timeout: 60000 });

  // Get the output text
  const output = await page.$eval('#output', el => el.textContent || '');
  console.log('Extracted output (first 500 chars):\n', output.slice(0, 500));

  await browser.close();
}

run().catch(err => {
  console.error('Puppeteer test failed:', err);
  process.exit(1);
}); 