import { FilesUtilWeb } from '../../src/files.web';

// Example usage for web
async function runExample() {
  // You must provide the path to the PDF.js worker script for PDF extraction
  const workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.2.133/pdf.worker.min.js';
  const filesUtil = new FilesUtilWeb(workerSrc);

  // Example: Extract text from a remote PDF file
  const pdfUrl = 'https://arxiv.org/pdf/1706.03762.pdf'; // Replace with your own test file URL
  try {
    const text = await filesUtil.urlToText(pdfUrl);
    console.log('Extracted text:', text.slice(0, 500) + '...'); // Print first 500 chars
  } catch (err) {
    console.error('Error extracting text:', err);
  }
}

runExample(); 