# file-tool-kit

A cross-platform TypeScript library for unified, high-level file manipulation and text extraction across Web (browser) and React Native environments.

## Features
- Extract text from PDF, DOCX, XLSX, CSV, PPTX, TXT, and JSON
- Consistent API for Web and React Native
- Easy to extend for new environments and file types
- Robust file type detection (magic numbers, extensions)
- Clear error for unsupported formats (e.g., legacy PPT/DOC/XLS)

## Supported File Types
- PDF (`.pdf`)
- Word (`.docx`, `.doc` [only for detection, not extraction])
- Excel (`.xlsx`, `.xls` [only for detection, not extraction])
- PowerPoint (`.pptx`)
- CSV (`.csv`)
- Plain text (`.txt`)
- JSON (`.json`)

> **Note:** Legacy Office formats (`.doc`, `.xls`, `.ppt`) are detected but not supported for extraction. You will get a clear error if you try to extract from them.

## Usage
```ts
// For browser/web:
import { FilesUtilWeb } from 'file-tool-kit/web';
// For React Native:
import { FilesUtilRN } from 'file-tool-kit/rn';

const filesUtil = new FilesUtilWeb(workerSrc); // see PDF.js Worker Setup below
// Use filesUtil.urlToText, filesUtil.serializedToText, etc.
```

### Internal Development (Path Aliases)
For contributors, path aliases are used for clean imports:
```ts
import { FILE_SIGNATURES } from '@shared/files.shared';
import { SerializedFile } from '@types/files.types';
```
Aliases are configured in `tsconfig.json` and supported in Vite and ts-node via plugins.

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