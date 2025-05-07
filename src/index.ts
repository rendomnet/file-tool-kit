import {
  SerializedData,
  SerializedFile,
  SerializedFormData,
  SerializedJson,
  FileWithOptionalName,
} from '@types/files.types';

import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import * as pdfjs from 'pdfjs-dist';

// Magic numbers for file type detection
const FILE_SIGNATURES = {
  PDF: new Uint8Array([0x25, 0x50, 0x44, 0x46]), // %PDF
  ZIP: new Uint8Array([0x50, 0x4b, 0x03, 0x04]), // PK..
  DOC_OLD: new Uint8Array([0xd0, 0xcf, 0x11, 0xe0]), // Old Word format
};

class FilesUtil {
  constructor(workerSrc: string) {
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  }

  async urlToText(url: string): Promise<string> {
    try {
      const serializedData = await this.urlToSerializedData(url);
      return this.serializedToText(serializedData);
    } catch (error) {
      throw new Error(
        `Failed to convert file to text: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  hasSignature(buffer: ArrayBuffer, signature: Uint8Array): boolean {
    const view = new Uint8Array(buffer, 0, signature.length);
    return signature.every((byte, i) => view[i] === byte);
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
      const byteCharacters = atob((serializedData as SerializedFile).value);
      const byteNumbers = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const arrayBuffer = byteNumbers.buffer;
      if (this.hasSignature(arrayBuffer, FILE_SIGNATURES.ZIP)) {
        const format = await this.detectOfficeFormat(arrayBuffer);
        if (format === 'docx') {
          const result = await mammoth.extractRawText({ arrayBuffer });
          return result.value;
        }
      }
      if (this.hasSignature(arrayBuffer, FILE_SIGNATURES.DOC_OLD)) {
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
      const byteCharacters = atob((serializedData as SerializedFile).value);
      const byteNumbers = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const arrayBuffer = byteNumbers.buffer;
      if (this.hasSignature(arrayBuffer, FILE_SIGNATURES.ZIP)) {
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

  async analyzeFileType(serializedFile: SerializedFile): Promise<{ extension: string; mimeType: string }> {
    const byteCharacters = atob(serializedFile.value);
    const byteNumbers = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const arrayBuffer = byteNumbers.buffer;
    if (this.hasSignature(arrayBuffer, FILE_SIGNATURES.PDF)) {
      return { extension: 'pdf', mimeType: 'application/pdf' };
    }
    if (this.hasSignature(arrayBuffer, FILE_SIGNATURES.ZIP)) {
      const format = await this.detectOfficeFormat(arrayBuffer);
      if (format) {
        const mimeTypes: { [key: string]: string } = {
          docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        };
        return { extension: format, mimeType: mimeTypes[format] };
      }
      return { extension: 'zip', mimeType: 'application/zip' };
    }
    if (this.hasSignature(arrayBuffer, FILE_SIGNATURES.DOC_OLD)) {
      return { extension: 'doc', mimeType: 'application/msword' };
    }
    return {
      extension: this.getFileExtension(serializedFile) || 'unknown',
      mimeType: serializedFile.type || 'application/octet-stream',
    };
  }

  async serializedToText(serializedData: SerializedData): Promise<string> {
    try {
      if (!serializedData || (serializedData.cls !== 'File' && serializedData.cls !== 'Blob')) {
        throw new Error('Invalid file data');
      }
      const fileInfo = await this.analyzeFileType(serializedData as SerializedFile);
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
        default: {
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
      const byteCharacters = atob((serializedData as SerializedFile).value);
      const byteNumbers = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const arrayBuffer = byteNumbers.buffer;
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 0; i < pdf.numPages; i++) {
        const page = await pdf.getPage(i + 1);
        const textContent = await page.getTextContent();
        fullText += textContent.items
          .filter((item: any): item is { str: string } => typeof item.str === 'string')
          .map((item) => (item as { str: string }).str)
          .join(' ');
      }
      return fullText;
    } catch (error) {
      throw new Error(
        `Failed to extract PDF text: ${error instanceof Error ? error.message : String(error)}`
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
        const serializedFormData: SerializedFormData = {
          cls: 'FormData',
          value: await Promise.all(
            Array.from(formData.keys(), async (key) => [
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

  getFileExtension(file: SerializedFile): string | null {
    const mimeToExtension: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/bmp': 'bmp',
      'image/tiff': 'tiff',
      'application/pdf': 'pdf',
      'text/plain': 'txt',
      'application/json': 'json',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.ms-powerpoint': 'ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
      'application/zip': 'zip',
    };
    return mimeToExtension[file.type] || null;
  }
}

export default FilesUtil;
