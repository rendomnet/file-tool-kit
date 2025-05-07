import { describe, it, expect } from 'vitest';
import { getFileExtension } from '../src/files.shared';

describe('getFileExtension', () => {
  it('should return the correct extension for known MIME types', () => {
    expect(getFileExtension('application/pdf')).toBe('pdf');
    expect(getFileExtension('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('docx');
    expect(getFileExtension('application/vnd.ms-excel')).toBe('xls');
    expect(getFileExtension('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe('xlsx');
    expect(getFileExtension('text/plain')).toBe('txt');
  });

  it('should return null for unknown MIME types', () => {
    expect(getFileExtension('application/unknown')).toBeNull();
  });
});
