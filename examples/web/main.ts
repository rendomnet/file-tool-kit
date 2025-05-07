import { FilesUtilWeb } from '../../src/files.web';

const workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.2.133/pdf.worker.min.js';
const filesUtil = new FilesUtilWeb(workerSrc);

const pdfUrl = 'https://arxiv.org/pdf/1706.03762.pdf'; // Example PDF
const btn = document.getElementById('extract-btn')!;
const output = document.getElementById('output')!;

btn.addEventListener('click', async () => {
  output.textContent = 'Extracting text...';
  try {
    const text = await filesUtil.urlToText(pdfUrl);
    output.textContent = text.slice(0, 2000) + (text.length > 2000 ? '\n... (truncated)' : '');
  } catch (err) {
    output.textContent = 'Error: ' + (err instanceof Error ? err.message : String(err));
  }
}); 