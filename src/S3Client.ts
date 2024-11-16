import fs from "node:fs";
import path from "node:path";
import stream from "node:stream";
import utils from "node:util";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3,
  type _Object,
} from "@aws-sdk/client-s3";
import mime from "mime";
import type { Config, File } from "./S3Client.types";

/**
 * @class S3Client
 * @classdesc AWS S3 Client for node.js
 * @property {Config} config - Configuration.
 * @method upload {Function} - Upload file
 * @method delete {Function} - Delete file
 * @method list {Function} - List files
 * @method download {Function} - Download file
 * @method setBucket {Function} - Set bucket
 */
export default class S3Client {
  /** @private {S3} client - S3 client instance */
  private client: S3;

  /** @private {URL} url - URL instance */
  private url: URL;

  /** @private {string} bucket - Bucket name */
  private bucket: string | undefined;

  /**
   * @constructor
   * @param {Config} config - Configuration.
   */
  constructor(private readonly config: Config) {
    this.client = new S3({
      region: this.config.region,
      credentials: this.config.credentials,
    });

    this.url = new URL(this.config.cdnUrl);
  }

  /**
   * Url generator
   *
   * @method
   * @param {string} pathName - Path name.
   * @private
   * @returns {string} - URL.
   */
  private urlGenerator(pathName: string): string {
    this.url.pathname = pathName;

    return this.url.toString();
  }

  /**
   * Check
   *
   * @method
   * @private
   * @throws {Error} - Bucket is not set.
   * @returns {Promise<void>}.
   */
  private async check(): Promise<void> {
    await this.checkCredentials();

    if (this.bucket === undefined) {
      throw new Error("Bucket is not set!");
    }
  }

  /**
   * checkCredentials
   *
   * @method
   * @private
   * @throws {Error} - Authentication failed.
   * @returns {Promise<void>}.
   */
  private async checkCredentials(): Promise<void> {
    const command = new ListBucketsCommand({});
    const response = await this.client.send(command);

    if (response.$metadata.httpStatusCode !== 200) {
      throw new Error("Authentication failed!");
    }
  }

  /**
   * File generator
   *
   * @method
   * @param {_Object} item - Item.
   * @private
   * @returns {File | undefined} - File.
   */
  private fileGenerator(item: _Object): File | undefined {
    if ((item?.Size ?? 0) > 0 && item.Key) {
      return {
        name: item.Key.split("/").pop() ?? "",
        key: item.Key,
        byte: item.Size as number,
        type: mime.getType(item.Key) || "unknown",
        url: this.urlGenerator(item.Key),
        lastModified: new Date(item.LastModified as Date),
      };
    }
  }

  /**
   * Check if file exists
   *
   * @method
   * @private
   * @param {string} key - Key.
   * @returns {Promise<boolean>} - True if file exists, false otherwise.
   */
  private async checkIfFileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({ Bucket: this.bucket, Key: key });
      await this.client.send(command);

      return true;
    } catch {
      return false;
    }
  }

  /**
   * setBucket
   *
   * @method
   * @param {string} bucket - Bucket name.
   * @returns {S3Client} - S3Client instance.
   */
  setBucket(bucket: string): S3Client {
    this.bucket = bucket;
    return this;
  }

  /**
   * Upload file to S3 bucket.
   *
   * @method
   * @param {object} options - Options.
   * @param {string | Buffer} options.file - File path or File buffer.
   * @param {string} options.destFile - Destination file.
   * @throws {Error} - Failed to upload file.
   * @returns {Promise<File>} - File.
   * @example
   * const file = await client.upload({
   *   file: "../example.jpg",
   *   destFile: "assets/example.jpg",
   * });
   *
   * const fileTwo = await client.upload({
   *   file: Buffer.from("EXAMPLE", "utf-8"),
   *   destFile: "assets/example.txt",
   * });
   */
  async upload(options: {
    file: string | Buffer;
    destFile: string;
  }): Promise<File> {
    try {
      await this.check();

      const { file, destFile } = options;

      const contentType =
        mime.getType(path.extname(file instanceof Buffer ? destFile : file)) ||
        "application/octet-stream";

      const uploadParams = {
        Bucket: this.bucket,
        Key: destFile,
        Body: file instanceof Buffer ? file : fs.createReadStream(file),
        ContentType: contentType,
      };

      const command = new PutObjectCommand(uploadParams);
      await this.client.send(command);

      const headObjectCommand = new HeadObjectCommand({
        Bucket: uploadParams.Bucket,
        Key: uploadParams.Key,
      });

      const headObjectCommandResponse =
        await this.client.send(headObjectCommand);

      const fileResult = this.fileGenerator({
        Key: uploadParams.Key,
        Size: file instanceof Buffer ? file.byteLength : fs.statSync(file).size,
        LastModified: headObjectCommandResponse.LastModified,
      }) as File;

      return fileResult;
    } catch (error) {
      console.log(error);

      throw new Error(
        error instanceof Error ? error.message : "Failed to upload file!",
      );
    }
  }

  /**
   * Delete file from S3 bucket.
   *
   * @method
   * @param {object} options - Options.
   * @param {string} options.file - File.
   * @throws {Error} - File does not exist.
   * @throws {Error} - Failed to delete file.
   * @returns {Promise<void>}.
   * @example
   * await s3Client.setBucket("bucket").delete({ file: "assets/example.jpeg" });
   */
  async delete(options: { file: string }): Promise<void> {
    try {
      const { file } = options;

      await this.check();
      const isFileExists = await this.checkIfFileExists(file);

      if (!isFileExists) {
        throw new Error("File does not exist!");
      }

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: file,
      });

      await this.client.send(command);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to delete file!",
      );
    }
  }

  /**
   * List files from S3 bucket.
   *
   * @method
   * @param {object} options - Options.
   * @param {string} options.path - Path.
   * @returns {Promise<File[]>} - Files.
   * @example
   * const files = await s3Client.setBucket("bucket").list({ path: "assets" });
   */
  async list(options?: { path?: string }): Promise<File[]> {
    try {
      await this.check();

      const { path } = options || {};

      const files: File[] = [];

      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: path,
      });

      const response = await this.client.send(command);

      if (
        !Array.isArray(response.Contents) ||
        (Array.isArray(response.Contents) && response.Contents.length === 0)
      ) {
        throw new Error("No files found!");
      }

      for (const item of response.Contents) {
        const file = this.fileGenerator(item);

        if (file) {
          files.push(file);
        }
      }

      return files;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to list files!",
      );
    }
  }

  /**
   * Download file from S3 bucket.
   *
   * @method
   * @param {object} options - Options.
   * @param {string} options.file - File.
   * @param {string} options.outFile - Out file.
   * @returns {Promise<void>}.
   * @example
   * await s3Client.setBucket("bucket").download({
   *   file: "assets/example.jpeg",
   *   outFile: path.join(__dirname, "./example.jpeg"),
   * });
   */
  async download(options: { file: string; outFile: string }): Promise<void> {
    try {
      const { file, outFile } = options;

      await this.check();

      const outDir = path.dirname(outFile);

      if (fs.existsSync(outFile)) {
        throw new Error("File already exists!");
      }

      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      const isFileExists = await this.checkIfFileExists(file);

      if (!isFileExists) {
        throw new Error("File does not exist!");
      }

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: file,
      });

      const response = await this.client.send(command);

      const streamPipeline = utils.promisify(stream.pipeline);

      if (!response.Body) {
        throw new Error("Response body is empty!");
      }

      const fileStream = fs.createWriteStream(outFile);

      await streamPipeline(response.Body as NodeJS.ReadableStream, fileStream);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to download file!",
      );
    }
  }
}
