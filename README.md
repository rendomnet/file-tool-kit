# file-tool-kit

A cross-platform TypeScript library for unified, high-level file manipulation and text extraction across Web (browser) and React Native environments.

## Features
- Extract text from PDF, DOCX, XLSX, CSV, PPTX, TXT, and JSON (PDF extraction is **not supported in React Native**)
- Consistent API for Web and React Native
- Easy to extend for new environments and file types
- Robust file type detection (magic numbers, extensions)
- Clear error for unsupported formats (e.g., legacy PPT/DOC/XLS)

## Supported File Types
- PDF (`.pdf`) *(Web only)*
- Word (`.docx`, `.doc` [only for detection, not extraction])
- Excel (`.xlsx`, `.xls` [only for detection, not extraction])
- PowerPoint (`.pptx`)
- CSV (`.csv`)
- Plain text (`.txt`)
- JSON (`.json`)

> **Note:** Legacy Office formats (`.doc`, `.xls`, `.ppt`) are detected but not supported for extraction. You will get a clear error if you try to extract from them.

## Usage Example

### Web (Browser)
```ts
// Import the web utility and the PDF.js worker URL
import { FilesUtilWeb } from 'file-tool-kit/web';
// @ts-ignore
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url';

const filesUtil = new FilesUtilWeb(workerSrc);

// Example: Extract text from a file input
async function handleFileInput(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];
  try {
    // Serialize the file (to base64, etc.)
    const serialized = await filesUtil.serializeFile(file);
    // Extract text
    const text = await filesUtil.serializedToText(serialized);
    console.log('Extracted text:', text);
  } catch (err) {
    console.error('Extraction error:', err);
  }
}
```

### React Native
```ts
import { FilesUtilRN } from 'file-tool-kit/rn';
const filesUtil = new FilesUtilRN();

// Example: Extract text from a file (using a file picker and base64)
async function extractTextFromFile(base64: string, fileType: string, fileName: string) {
  try {
    // Create a serialized file object
    const serialized = {
      cls: 'File',
      name: fileName,
      type: fileType,
      lastModified: Date.now(),
      value: base64,
    };
    // Extract text
    const text = await filesUtil.serializedToText(serialized);
    console.log('Extracted text:', text);
  } catch (err) {
    console.error('Extraction error:', err);
  }
}
```

### React Native Support & PDF Extraction
- All formats except PDF are supported in React Native (DOCX, XLSX, PPTX, CSV, TXT, JSON).
- **PDF extraction is not supported in React Native.**
- For PDF extraction in React Native, use a server-side/cloud solution:
  1. Upload the PDF to your backend.
  2. Extract text using a Node.js or Python library (e.g., `pdf-parse`, `PyPDF2`).
  3. Return the extracted text to your app.
- The library will throw a clear error if you attempt PDF extraction in React Native.

### Internal Development (Path Aliases)
For contributors, path aliases are used for clean imports:
```ts
import { FILE_SIGNATURES } from '@shared/files.shared';
import { SerializedFile } from '@types/files.types';
```
Aliases are configured in `tsconfig.json` and supported in Vite and ts-node via plugins.

## API
- `urlToText(url: string): Promise<string>` *(Web only)*
- `serializedToText(serializedData: SerializedData): Promise<string>`
- ...

## Installation
```sh
pnpm add file-tool-kit
```

## License
MIT 

## PDF.js Worker Setup (Web)

When using PDF extraction in the browser, you must provide the path to the PDF.js worker script. For modern bundlers like Vite or webpack, use the `?url` import to get the correct worker URL:

```ts
// Vite/webpack example:
// @ts-ignore
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { FilesUtilWeb } from 'file-tool-kit/web';

const filesUtil = new FilesUtilWeb(workerSrc); // workerSrc can be a string or { url: string }
```

- The library supports both a string URL or an object with a `url` property (as some bundlers may provide).
- If you are not using a bundler, you can provide a direct path to the worker script as a string. 

## Running Integration (E2E) Tests

To start the web example server:

```sh
pnpm run server:web
```

To run the browser-based integration test (Puppeteer):

```sh
pnpm run test:e2e:web
```

This will launch a headless browser, run extraction for all supported file types, and assert expected output (e.g., 'lorem ipsum' in DOCX and PPTX).

To run both the web server and the E2E test in a single command:

```sh
pnpm run test:e2e:web:full
```

This will start the dev server, wait for it to be ready, run the E2E test, and shut down the server automatically.

## Troubleshooting Path Aliases
- **Vite**: Path aliases are supported via the `vite-tsconfig-paths` plugin (see `examples/web/vite.config.ts`).
- **ts-node**: Path aliases are supported via `tsconfig-paths/register` (see E2E test scripts).
- If you see errors about unresolved imports like `@shared/files.shared`, ensure you are using the correct scripts and have all dev dependencies installed.

## Error Handling for Unsupported Formats
If you try to extract from an unsupported file type (e.g., legacy `.ppt`, `.doc`, `.xls`), you will get a clear error message:

```
Error: Unsupported file type: ppt. Supported types are: pdf, doc, docx, xls, xlsx, txt, json, csv, pptx
```

---

No external PPTX parser is used; all extraction is handled internally using JSZip and XML parsing. 