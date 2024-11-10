import type { Region } from "./S3Client.enums";

export interface Credentials {
  accessKeyId: string;
  secretAccessKey: string;
}

export interface S3ClientConfig {
  region: `${Region}`;
  credentials: Credentials;
  cdnUrl: string;
}

export interface File {
  name: string;
  key: string;
  byte: number;
  type: string;
  url: string;
  lastModified: Date;
}
