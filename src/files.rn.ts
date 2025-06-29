import { FILE_SIGNATURES, hasSignature, getFileExtension, base64ToArrayBuffer } from './files.shared';
import { SerializedData, SerializedFile, SerializedFormData, SerializedJson, FileWithOptionalName } from './types/files.types';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { PPTXExtractor } from './pptx-extractor';

const SUPPORTED_EXTENSIONS = [
  'doc', 'docx', 'xls', 'xlsx', 'txt', 'json', 'csv', 'pptx'
];

export class FilesUtilRN {
  constructor() {
    // React Native-specific setup if needed
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
    if (hasSignature(arrayBuffer, FILE_SIGNATURES.ZIP)) {
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
    if (hasSignature(arrayBuffer, FILE_SIGNATURES.DOC_OLD)) {
      if (fileUrl) {
        const extMatch = fileUrl.match(/\.([a-zA-Z0-9]+)$/);
        if (extMatch) {
          const ext = extMatch[1].toLowerCase();
          if (ext === 'doc') { return { extension: 'doc', mimeType: 'application/msword' }; }
          if (ext === 'xls') { return { extension: 'xls', mimeType: 'application/vnd.ms-excel' }; }
          if (ext === 'ppt') { return { extension: 'ppt', mimeType: 'application/vnd.ms-powerpoint' }; }
        }
      }
      return { extension: 'doc', mimeType: 'application/msword' };
    }
    // Fallback: use file extension from fileUrl if available
    if (fileUrl) {
      const extMatch = fileUrl.match(/\.([a-zA-Z0-9]+)$/);
      if (extMatch) {
        const ext = extMatch[1].toLowerCase();
        const mimeTypes: { [key: string]: string } = {
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
        return { extension: ext, mimeType: mimeTypes[ext] || 'application/octet-stream' };
      }
    }
    // Fallback: unknown
    const fallbackExt = getFileExtension(serializedFile.type) || 'unknown';
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
        case 'pdf': {
          throw new Error('PDF extraction is not supported in React Native.');
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
} 