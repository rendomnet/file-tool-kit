# file-tool-kit

A cross-platform TypeScript library for unified, high-level file manipulation and text extraction across Web (browser) and React Native environments.

## Features
- Extract text from PDF, DOCX, XLSX, and more
- Consistent API for Web and React Native
- Easy to extend for new environments and file types

## Usage
```ts
// For browser/web:
import { FilesUtilWeb } from 'file-tool-kit/web';
// For React Native:
import { FilesUtilRN } from 'file-tool-kit/rn';

const filesUtil = new FilesUtilWeb(/* ... */);
// Use filesUtil.urlToText, filesUtil.serializedToText, etc.
```

## API
- `urlToText(url: string): Promise<string>`
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