import type { Region } from "./S3Client.enums";

/**
 * @typedef {Object} Credentials
 * @property {string} accessKeyId - AWS access key ID.
 * @property {string} secretAccessKey - AWS secret access key.
 */
export interface Credentials {
  accessKeyId: string;
  secretAccessKey: string;
}

/**
 * @typedef {Object} Config
 * @property {Region} region - AWS region.
 * @property {Credentials} credentials - AWS credentials.
 * @property {string} cdnUrl - CDN URL.
 */
export interface Config {
  region: `${Region}`;
  credentials: Credentials;
  cdnUrl: string;
}

/**
 * @typedef {Object} File
 * @property {string} name - File name.
 * @property {string} key - File key.
 * @property {number} byte - File byte.
 * @property {string} type - File type.
 * @property {string} url - File URL.
 * @property {Date} lastModified - File last modified date.
 */
export interface File {
  name: string;
  key: string;
  byte: number;
  type: string;
  url: string;
  lastModified: Date;
}
