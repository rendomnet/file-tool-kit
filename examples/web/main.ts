// @ts-ignore
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { FilesUtilWeb } from '../../src/files.web';

const filesUtil = new FilesUtilWeb(workerSrc);

// Example file paths (served from examples/documents via Vite publicDir)
const pdfUrl = '/example.pdf';
// const docxUrl = '/example.docx';
// const xlsxUrl = '/example.xlsx';
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