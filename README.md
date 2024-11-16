# AWS S3 Client for Node.js

![NPM Version](https://img.shields.io/npm/v/node-aws-s3-client?link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Fnode-aws-s3-client)
![NPM Bundle Size](https://img.shields.io/bundlephobia/min/node-aws-s3-client?link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Fnode-aws-s3-client)
![NPM Downloads](https://img.shields.io/npm/dw/node-aws-s3-client?link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Fnode-aws-s3-client)

### Installation
```bash
# npm
npm install node-aws-s3-client

# yarn
yarn add node-aws-s3-client

# pnpm
pnpm add node-aws-s3-client
```

### Usage
```typescript
import S3Client, { Region } from "node-aws-s3-client";

const s3Client = new S3Client({
  region: Region.EUCentral1, // AWS S3 Region - Required
  credentials: {
    accessKeyId: "accessKeyId", // AWS S3 Access Key Id - Required
    secretAccessKey: "secretAccessKey", // AWS Secret Access Key - Required
  },
  cdnUrl: "https://cdn.example.com", // AWS CDN Url - Required
  defaultBucket: "default-bucket" // AWS S3 Bucket Name - Optional
});
```

> [!TIP]
> You can use the `setBucket` method when you need to change the bucket.
>
> ```typescript
> await s3Client.setBucket("bucket-name").delete({ file: "assets/example.jpeg" });
> ```

**Delete file**
```typescript
await s3Client.delete({ file: "assets/example.jpeg" });
```

**Upload file**
```typescript
// File path
const uploadedFile = await s3Client.upload({
  file: path.join(__dirname, "../example.jpeg"),
  destFile: "assets/example.jpeg",
});

// Buffer
const uploadedFileTwo = await s3Client.upload({
  file: Buffer.from("EXAMPLE", "utf-8"),
  destFile: "assets/example.txt",
});
```

**List files**
```typescript
const files = await s3Client.list({
  path: "assets",
});
```

**Download file**
```typescript
await s3Client.download({
  file: "assets/example.jpeg",
  outFile: path.join(__dirname, "./example.jpeg"),
});
```
