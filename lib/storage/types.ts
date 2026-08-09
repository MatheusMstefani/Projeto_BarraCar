export interface PrivateStorage {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Uint8Array>;
  delete?(key: string): Promise<void>;
  healthCheck?(): Promise<void>;
}
