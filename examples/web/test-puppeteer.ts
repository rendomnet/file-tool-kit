import puppeteer from 'puppeteer';

const fileTypes = [
  { label: 'PDF', value: '/example.pdf' },
  { label: 'DOC (legacy)', value: '/example.doc' },
  { label: 'DOCX', value: '/example.docx' },
  { label: 'XLS (legacy)', value: '/example.xls' },
  { label: 'XLSX', value: '/example.xlsx' },
  { label: 'PPT (legacy)', value: '/example.ppt' },
  { label: 'PPT (legacy) 2', value: '/example-2.ppt' },
  { label: 'CSV', value: '/example.csv' },
  { label: 'PPTX', value: '/example.pptx' },
];

const expectedTexts: Record<string, string> = {
  '/example.docx': 'lorem ipsum',
  '/example.pptx': 'lorem ipsum',
  // Add more as needed
};

async function run() {
  // Start browser
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Go to the local Vite dev server (assume default port)
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

  let failed = false;

  for (const file of fileTypes) {
    // Select the file type in the dropdown
    await page.select('#file-select', file.value);
    // Click the extract button
    await page.click('#extract-btn');
    // Wait for the output to change from 'Extracting text...'
    await page.waitForFunction(
      (fileUrl) => {
        const el = document.getElementById('output');
        return el && el.textContent && !el.textContent.startsWith(`Extracting text from ${fileUrl}`);
      },
      { timeout: 60000 },
      file.value
    );
    // Get the output text
    const output = await page.$eval('#output', el => el.textContent || '');
    console.log(`\n[${file.label}] Extracted output (first 500 chars):\n`, output.slice(0, 500));
    if (expectedTexts[file.value] && !output.toLowerCase().includes(expectedTexts[file.value])) {
      console.error(`[${file.label}] Test failed: Expected text not found!`);
      failed = true;
    }
  }

  await browser.close();
  if (failed) {
    throw new Error('Some tests failed. See above for details.');
  } else {
    console.log('All integration tests passed!');
  }
}

run().catch(err => {
  console.error('Puppeteer test failed:', err);
  process.exit(1);
}); 