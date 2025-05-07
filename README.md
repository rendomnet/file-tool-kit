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