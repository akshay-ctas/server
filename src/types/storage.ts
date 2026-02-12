export interface FileData {
  filename: string;
  fileData: Buffer | Uint8Array;
}

export interface FileStorage {
  upload(data: FileData): Promise<void>;
  delete(filename: string): void;
  getObjectURI(filename: string): string;
}
