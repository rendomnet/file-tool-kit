// Type definitions
type SerializedFormData = {
  cls: 'FormData';
  value: Array<[string, SerializedData[]]>;
};

type SerializedFile = {
  cls: 'File' | 'Blob';
  name: string;
  type: string;
  lastModified: number;
  value: string;
};

type SerializedJson = {
  cls: 'json';
  value: string;
};

type SerializedData = SerializedFormData | SerializedFile | SerializedJson | undefined;

interface FileWithOptionalName extends Blob {
  name?: string;
  lastModified?: number;
}

export type { SerializedData, SerializedFormData, SerializedFile, SerializedJson, FileWithOptionalName };
