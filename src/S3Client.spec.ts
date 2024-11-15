import fs from "node:fs";
import path from "node:path";
import utils from "node:util";
import mime from "mime";
import { type MockInstance, describe, it, vi } from "vitest";
import S3Client from "./S3Client";
import { Region } from "./S3Client.enums";
import type { Config, File } from "./S3Client.types";

const bucketNameMock = "example-bucket";

const config: Config = {
  region: Region.EUCentral1,
  credentials: {
    accessKeyId: "accessKeyId",
    secretAccessKey: "secretAccessKey",
  },
  cdnUrl: "https://cdn.example.com",
};

const listResponseMock = {
  $metadata: {
    httpStatusCode: 200,
    requestId: "requestId",
    extendedRequestId: "extendedRequestId",
    cfId: undefined,
    attempts: 1,
    totalRetryDelay: 0,
  },
  Contents: [
    {
      Key: "assets/",
      LastModified: new Date("2023-09-11T19:07:26.000Z"),
      ETag: '"ETag"',
      Size: 0,
      StorageClass: "STANDARD",
    },
    {
      Key: "assets/example.jpeg",
      LastModified: new Date("2024-05-21T21:07:12.000Z"),
      ETag: '"ETag"',
      ChecksumAlgorithm: [],
      Size: 12345,
      StorageClass: "STANDARD",
    },
  ],
  IsTruncated: false,
  KeyCount: 100,
  MaxKeys: 1000,
  Name: bucketNameMock,
  Prefix: "",
};

const awsSDKClientS3Mock = vi.hoisted(() => {
  return {
    client: vi.fn(),
    send: vi.fn(),
  };
});

const cdnUrlInstance = new URL(config.cdnUrl);
cdnUrlInstance.pathname = listResponseMock.Contents[1].Key;

const fileMock: File = {
  name: path.basename(listResponseMock.Contents[1].Key),
  key: listResponseMock.Contents[1].Key,
  byte: listResponseMock.Contents[1].Size,
  type: mime.getType(listResponseMock.Contents[1].Key) as string,
  url: cdnUrlInstance.toString(),
  lastModified: listResponseMock.Contents[1].LastModified,
};

vi.mock("@aws-sdk/client-s3", async (importOriginal) => {
  const Client = awsSDKClientS3Mock.client;
  Client.prototype.send = awsSDKClientS3Mock.send;

  return {
    ...(await importOriginal<typeof import("@aws-sdk/client-s3")>()),
    S3: Client,
  };
});

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
vi.spyOn(S3Client.prototype as any, "checkCredentials").mockResolvedValue(true);
vi.spyOn(fs, "createReadStream").mockReturnValue({} as fs.ReadStream);
vi.spyOn(fs, "existsSync").mockReturnValue(false);
vi.spyOn(fs, "mkdirSync").mockImplementation(() => undefined);
vi.spyOn(utils, "promisify").mockReturnValue(() => Promise.resolve(undefined));
vi.spyOn(fs, "statSync").mockReturnValue({
  size: fileMock.byte,
} as fs.Stats);

describe("S3Client", () => {
  const client = new S3Client(config);

  describe("list method", () => {
    it("should throw the error when bucket not set", async ({ expect }) => {
      const fn = async (): Promise<void> => {
        await client.list({ path: "assets" });
      };

      await expect(fn).rejects.toThrow(Error);
    });

    it("should list the files when files exist", async ({ expect }) => {
      awsSDKClientS3Mock.send.mockImplementation(() =>
        Promise.resolve(listResponseMock),
      );

      const files = await client.setBucket(bucketNameMock).list({
        path: "assets",
      });

      expect(awsSDKClientS3Mock.send).toHaveBeenCalled();
      expect(files).toBeInstanceOf(Array);
      expect(files).toHaveLength(1);
      expect(files).toStrictEqual([fileMock]);
    });

    it("should not list the files when files are not found", async ({
      expect,
    }) => {
      awsSDKClientS3Mock.send.mockImplementation(() =>
        Promise.resolve({ ...listResponseMock, Contents: [] }),
      );

      const fn = async (): Promise<void> => {
        await client.setBucket(bucketNameMock).list({
          path: "assets",
        });
      };

      expect(awsSDKClientS3Mock.send).toHaveBeenCalled();
      await expect(fn).rejects.toThrow(Error);
    });

    it("should give an error if there is any issue", async ({ expect }) => {
      awsSDKClientS3Mock.send.mockImplementation(() => Promise.reject());

      const fn = async (): Promise<void> => {
        await client.setBucket(bucketNameMock).list({
          path: "assets",
        });
      };

      expect(awsSDKClientS3Mock.send).toHaveBeenCalled();
      await expect(fn).rejects.toThrow(Error);
    });
  });

  describe("delete method", () => {
    let checkIfFileExistsSpy: MockInstance;

    beforeEach(() => {
      checkIfFileExistsSpy = vi
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        .spyOn(S3Client.prototype as any, "checkIfFileExists")
        .mockResolvedValue(true);
    });

    it("should throw the error when bucket not set", async ({ expect }) => {
      const fn = async (): Promise<void> => {
        await client.delete({ file: "assets/example.jpeg" });
      };

      await expect(fn).rejects.toThrow(Error);
    });

    it("should delete the file", async ({ expect }) => {
      awsSDKClientS3Mock.send.mockImplementation(() => Promise.resolve());

      const output = await client.setBucket(bucketNameMock).delete({
        file: "assets/example.jpeg",
      });

      expect(output).toBeUndefined();
      expect(awsSDKClientS3Mock.send).toHaveBeenCalled();
    });

    it("should not delete the file when file is not found", async ({
      expect,
    }) => {
      checkIfFileExistsSpy.mockResolvedValue(false);

      const fn = async (): Promise<void> => {
        await client.setBucket(bucketNameMock).delete({
          file: "assets/example.jpeg",
        });
      };

      expect(awsSDKClientS3Mock.send).toHaveBeenCalled();
      await expect(fn).rejects.toThrow(Error);
    });

    it("should give an error if there is any issue", async ({ expect }) => {
      awsSDKClientS3Mock.send.mockImplementation(() => Promise.reject());

      const fn = async (): Promise<void> => {
        await client.setBucket(bucketNameMock).delete({
          file: "assets/example.jpeg",
        });
      };

      expect(awsSDKClientS3Mock.send).toHaveBeenCalled();
      await expect(fn).rejects.toThrow(Error);
    });
  });

  describe("upload method", () => {
    it("should throw the error when bucket not set", async ({ expect }) => {
      const fn = async (): Promise<void> => {
        await client.upload({
          file: "./example.jpeg",
          destFile: "assets/example.jpeg",
        });
      };

      await expect(fn).rejects.toThrow(Error);
    });

    it("should upload the file", async ({ expect }) => {
      awsSDKClientS3Mock.send.mockImplementation(() =>
        Promise.resolve({
          LastModified: listResponseMock.Contents[1].LastModified,
        }),
      );

      const file = await client.setBucket(bucketNameMock).upload({
        file: "./example.jpeg",
        destFile: "assets/example.jpeg",
      });

      expect(file).toStrictEqual(fileMock);
      expect(awsSDKClientS3Mock.send).toHaveBeenCalled();
    });

    it("should give an error if there is any issue", async ({ expect }) => {
      awsSDKClientS3Mock.send.mockImplementation(() => Promise.reject());

      const fn = async (): Promise<void> => {
        await client.setBucket(bucketNameMock).upload({
          file: "./example.jpeg",
          destFile: "assets/example.jpeg",
        });
      };

      expect(awsSDKClientS3Mock.send).toHaveBeenCalled();
      await expect(fn).rejects.toThrow(Error);
    });
  });

  describe("download method", () => {
    let checkIfFileExistsSpy: MockInstance;

    beforeEach(() => {
      checkIfFileExistsSpy = vi
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        .spyOn(S3Client.prototype as any, "checkIfFileExists")
        .mockResolvedValue(true);
    });

    it("should throw the error when bucket not set", async ({ expect }) => {
      const fn = async (): Promise<void> => {
        await client.download({
          file: "assets/example.jpeg",
          outFile: "./example.jpeg",
        });
      };

      await expect(fn).rejects.toThrow(Error);
    });

    it("should download the file", async ({ expect }) => {
      awsSDKClientS3Mock.send.mockImplementation(() =>
        Promise.resolve({
          Body: {},
        }),
      );

      const output = await client.setBucket(bucketNameMock).download({
        file: "assets/example.jpeg",
        outFile: "./example.jpeg",
      });

      expect(output).toBeUndefined();
      expect(awsSDKClientS3Mock.send).toHaveBeenCalled();
    });

    it("should not download the file when file is not found", async ({
      expect,
    }) => {
      checkIfFileExistsSpy.mockResolvedValue(false);

      const fn = async (): Promise<void> => {
        await client.setBucket(bucketNameMock).download({
          file: "assets/example.jpeg",
          outFile: "./example.jpeg",
        });
      };

      expect(awsSDKClientS3Mock.send).toHaveBeenCalled();
      await expect(fn).rejects.toThrow(Error);
    });

    it("should give an error if there is any issue", async ({ expect }) => {
      awsSDKClientS3Mock.send.mockImplementation(() => Promise.reject());

      const fn = async (): Promise<void> => {
        await client.setBucket(bucketNameMock).download({
          file: "assets/example.jpeg",
          outFile: "./example.jpeg",
        });
      };

      expect(awsSDKClientS3Mock.send).toHaveBeenCalled();
      await expect(fn).rejects.toThrow(Error);
    });
  });
});
