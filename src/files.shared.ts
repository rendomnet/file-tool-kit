// Shared utilities for file-tool-kit
// Place file type detection, base64, and extension mapping here

export const FILE_SIGNATURES = {
  PDF: new Uint8Array([0x25, 0x50, 0x44, 0x46]), // %PDF
  ZIP: new Uint8Array([0x50, 0x4b, 0x03, 0x04]), // PK..
  DOC_OLD: new Uint8Array([0xd0, 0xcf, 0x11, 0xe0]), // Old Word format
};

export function hasSignature(buffer: ArrayBuffer, signature: Uint8Array): boolean {
  const view = new Uint8Array(buffer, 0, signature.length);
  return signature.every((byte, i) => view[i] === byte);
}

export function getFileExtension(mimeType: string): string | null {
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
  return mimeToExtension[mimeType] || null;
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  if (typeof atob !== 'undefined') {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
  throw new Error('Base64 decoding is not available in this environment.');
} 