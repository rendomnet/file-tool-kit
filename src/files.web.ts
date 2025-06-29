import { FILE_SIGNATURES, hasSignature, getFileExtension, base64ToArrayBuffer } from './files.shared';
import { SerializedData, SerializedFile, SerializedFormData, SerializedJson, FileWithOptionalName } from './types/files.types';
// @ts-ignore
import * as XLSX from 'xlsx';
// @ts-ignore
import mammoth from 'mammoth';
// @ts-ignore
import JSZip from 'jszip';
// @ts-ignore
import * as pdfjs from 'pdfjs-dist';
import { PPTXExtractor } from './pptx-extractor';

// Supported file extensions for extraction
const SUPPORTED_EXTENSIONS = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'json', 'csv', 'pptx'
];

export class FilesUtilWeb {
  constructor(workerSrc: string) {
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  }

  async urlToText(url: string): Promise<string> {
    try {
      const serializedData = await this.urlToSerializedData(url);
      return this.serializedToText(serializedData, url);
    } catch (error) {
      throw new Error(
        `Failed to convert file to text: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async detectOfficeFormat(arrayBuffer: ArrayBuffer): Promise<string | null> {
    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(arrayBuffer);
      if (contents.file('word/document.xml')) {
        return 'docx';
      }
      if (contents.file('xl/workbook.xml')) {
        return 'xlsx';
      }
      if (contents.file('ppt/presentation.xml')) {
        return 'pptx';
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async extractTextFromWord(serializedData: SerializedData): Promise<string> {
    if (!serializedData || (serializedData.cls !== 'File' && serializedData.cls !== 'Blob')) {
      throw new Error('Provided data is not a valid Word file.');
    }
    try {
      const arrayBuffer = base64ToArrayBuffer((serializedData as SerializedFile).value);
      if (hasSignature(arrayBuffer, FILE_SIGNATURES.ZIP)) {
        const format = await this.detectOfficeFormat(arrayBuffer);
        if (format === 'docx') {
          const result = await mammoth.extractRawText({ arrayBuffer });
          return result.value;
        }
      }
      if (hasSignature(arrayBuffer, FILE_SIGNATURES.DOC_OLD)) {
        throw new Error('Legacy DOC format detected. Please convert to DOCX.');
      }
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch (error) {
      throw new Error(
        `Failed to extract Word document text: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async extractTextFromExcel(serializedData: SerializedData): Promise<string> {
    if (!serializedData || (serializedData.cls !== 'File' && serializedData.cls !== 'Blob')) {
      throw new Error('Provided data is not a valid Excel file.');
    }
    try {
      const arrayBuffer = base64ToArrayBuffer((serializedData as SerializedFile).value);
      if (hasSignature(arrayBuffer, FILE_SIGNATURES.ZIP)) {
        const format = await this.detectOfficeFormat(arrayBuffer);
        if (format === 'xlsx') {
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          return this.processExcelWorkbook(workbook);
        }
      }
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      return this.processExcelWorkbook(workbook);
    } catch (error) {
      throw new Error(
        `Failed to extract Excel text: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  processExcelWorkbook(workbook: XLSX.WorkBook): string {
    let fullText = '';
    workbook.SheetNames.forEach((sheetName: string) => {
      const sheet = workbook.Sheets[sheetName];
      const sheetText = XLSX.utils.sheet_to_csv(sheet);
      fullText += `Sheet: ${sheetName}\n${sheetText}\n\n`;
    });
    return fullText;
  }

  async analyzeFileType(serializedFile: SerializedFile, fileUrl?: string): Promise<{ extension: string; mimeType: string }> {
    const arrayBuffer = base64ToArrayBuffer(serializedFile.value);
    if (hasSignature(arrayBuffer, FILE_SIGNATURES.PDF)) {
      console.log('Detected file type: pdf');
      return { extension: 'pdf', mimeType: 'application/pdf' };
    }
    if (hasSignature(arrayBuffer, FILE_SIGNATURES.ZIP)) {
      const format = await this.detectOfficeFormat(arrayBuffer);
      if (format) {
        const mimeTypes: { [key: string]: string } = {
          docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        };
        console.log('Detected file type:', format);
        return { extension: format, mimeType: mimeTypes[format] };
      }
      console.log('Detected file type: zip');
      return { extension: 'zip', mimeType: 'application/zip' };
    }
    if (hasSignature(arrayBuffer, FILE_SIGNATURES.DOC_OLD)) {
      if (fileUrl) {
        const extMatch = fileUrl.match(/\.([a-zA-Z0-9]+)$/);
        if (extMatch) {
          const ext = extMatch[1].toLowerCase();
          if (ext === 'doc') { console.log('Detected file type: doc'); return { extension: 'doc', mimeType: 'application/msword' }; }
          if (ext === 'xls') { console.log('Detected file type: xls'); return { extension: 'xls', mimeType: 'application/vnd.ms-excel' }; }
          if (ext === 'ppt') { console.log('Detected file type: ppt'); return { extension: 'ppt', mimeType: 'application/vnd.ms-powerpoint' }; }
        }
      }
      console.log('Detected file type: doc (legacy)');
      return { extension: 'doc', mimeType: 'application/msword' };
    }
    // Fallback: use file extension from fileUrl if available
    if (fileUrl) {
      const extMatch = fileUrl.match(/\.([a-zA-Z0-9]+)$/);
      if (extMatch) {
        const ext = extMatch[1].toLowerCase();
        const mimeTypes: { [key: string]: string } = {
          pdf: 'application/pdf',
          docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          doc: 'application/msword',
          xls: 'application/vnd.ms-excel',
          pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          ppt: 'application/vnd.ms-powerpoint',
          txt: 'text/plain',
          json: 'application/json',
          csv: 'text/csv',
        };
        console.log('Detected file type (by extension):', ext);
        return { extension: ext, mimeType: mimeTypes[ext] || 'application/octet-stream' };
      }
    }
    // Fallback: unknown
    const fallbackExt = getFileExtension(serializedFile.type) || 'unknown';
    console.log('Detected file type (fallback):', fallbackExt);
    return {
      extension: fallbackExt,
      mimeType: serializedFile.type || 'application/octet-stream',
    };
  }

  async serializedToText(serializedData: SerializedData, fileUrl?: string): Promise<string> {
    try {
      if (!serializedData || (serializedData.cls !== 'File' && serializedData.cls !== 'Blob')) {
        throw new Error('Invalid file data');
      }
      const fileInfo = await this.analyzeFileType(serializedData as SerializedFile, fileUrl);
      if (!SUPPORTED_EXTENSIONS.includes(fileInfo.extension)) {
        throw new Error(`Unsupported file type: ${fileInfo.extension}. Supported types are: ${SUPPORTED_EXTENSIONS.join(', ')}`);
      }
      switch (fileInfo.extension) {
        case 'pdf': {
          return await this.extractTextFromPDF(serializedData);
        }
        case 'doc':
        case 'docx': {
          return await this.extractTextFromWord(serializedData);
        }
        case 'xls':
        case 'xlsx': {
          return await this.extractTextFromExcel(serializedData);
        }
        case 'txt':
        case 'json': {
          return atob((serializedData as SerializedFile).value);
        }
        case 'csv': {
          return atob((serializedData as SerializedFile).value);
        }
        case 'pptx': {
          return await this.extractTextFromPPTX(serializedData);
        }
        default: {
          // This should never be reached due to the check above
          throw new Error(`Unsupported file type: ${fileInfo.extension}`);
        }
      }
    } catch (error) {
      throw new Error(
        `Failed to serialized document: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async extractTextFromPDF(serializedData: SerializedData): Promise<string> {
    if (!serializedData || (serializedData.cls !== 'File' && serializedData.cls !== 'Blob')) {
      throw new Error('Provided data is not a valid PDF file.');
    }
    try {
      const arrayBuffer = base64ToArrayBuffer((serializedData as SerializedFile).value);
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 0; i < pdf.numPages; i++) {
        const page = await pdf.getPage(i + 1);
        const textContent = await page.getTextContent();
        fullText += textContent.items
          .filter((item: any): item is { str: string } => typeof (item as any).str === 'string')
          .map((item: any) => (item as { str: string }).str)
          .join(' ');
      }
      return fullText;
    } catch (error) {
      throw new Error(
        `Failed to extract PDF text: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async extractTextFromPPTX(serializedData: SerializedData): Promise<string> {
    if (!serializedData || (serializedData.cls !== 'File' && serializedData.cls !== 'Blob')) {
      throw new Error('Provided data is not a valid PPTX file.');
    }
    try {
      const arrayBuffer = base64ToArrayBuffer((serializedData as SerializedFile).value);
      const extracted = await PPTXExtractor.extract(arrayBuffer, { format: 'text' });
      if (typeof extracted !== 'string' || !extracted.trim()) {
        throw new Error('PPTXExtractor result is empty or not a string.');
      }
      return extracted;
    } catch (error) {
      throw new Error(
        `Failed to extract PPTX text: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async serializeFile(
    src: FormData | Blob | File | null | undefined,
    filename: string | null = null
  ): Promise<SerializedData> {
    if (src == null) {
      return undefined;
    }
    const cls = Object.prototype.toString.call(src).slice(8, -1);
    switch (cls) {
      case 'FormData': {
        const formData = src as FormData;
        // @ts-ignore
        const keys = Array.from(new Set(Array.from(formData.entries() as IterableIterator<[string, FormDataEntryValue]>).map(([key]) => key)));
        const serializedFormData: SerializedFormData = {
          cls: 'FormData',
          value: await Promise.all(
            keys.map(async (key: string) => [
              key,
              await Promise.all(
                formData.getAll(key).map((item) => this.serializeFile(item as Blob | File))
              ),
            ])
          ),
        };
        return serializedFormData;
      }
      case 'Blob':
      case 'File': {
        return new Promise((resolve, reject) => {
          const fileData = src as FileWithOptionalName;
          const name = (fileData.name || filename || 'untitled') as string;
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const serializedFile: SerializedFile = {
              cls: cls as 'File' | 'Blob',
              name,
              type: fileData.type,
              lastModified: fileData.lastModified || Date.now(),
              value: result.slice(result.indexOf(',') + 1),
            };
            resolve(serializedFile);
          };
          reader.onerror = () => {
            reject(new Error(`Failed to read ${cls}: ${reader.error}`));
          };
          reader.readAsDataURL(fileData);
        });
      }
      default: {
        const serializedJson: SerializedJson = {
          cls: 'json',
          value: JSON.stringify(src),
        };
        return serializedJson;
      }
    }
  }

  async urlToSerializedData(url: string, filename?: string): Promise<SerializedData> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      if (url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(url);
        } catch (error) {
          console.error('Failed to revoke object URL:', error);
        }
      }
      return await this.serializeFile(blob, filename);
    } catch (error) {
      throw new Error(
        `Failed to fetch URL: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
} 