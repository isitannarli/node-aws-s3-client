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
  region: Region.EUCentral1,
  credentials: {
    accessKeyId: "accessKeyId",
    secretAccessKey: "secretAccessKey",
  },
  cdnUrl: "https://cdn.example.com",
});
```

**Delete file**
```typescript
await s3Client
  .setBucket("bucket")
  .delete({ file: "assets/example.jpeg" });
```
**Upload file**
```typescript
const uploadedFile = await s3Client
  .setBucket("bucket")
  .upload({
    file: path.join(__dirname, "../example.jpeg"),
    destFile: "assets/example.jpeg",
  });
```
**List files**
```typescript
const files = await s3Client
  .setBucket("bucket")
  .list({
    path: "assets",
  });
```

**Download file**
```typescript
await s3Client
  .setBucket("bucket")
  .download({
    file: "assets/example.jpeg",
    outFile: path.join(__dirname, "./example.jpeg"),
  });
```
