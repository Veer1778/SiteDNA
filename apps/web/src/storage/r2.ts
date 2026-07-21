import { GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import type { AssetStore } from "./types";

/**
 * Real Cloudflare R2-backed `AssetStore` (R2 is S3-compatible, so this is a plain `S3Client`
 * pointed at R2's endpoint). Constructed only when `R2_*` env vars are set (see
 * `store-factory.ts`); no test in this repo exercises it (no credentials available here), same
 * as `AnthropicVisionProvider` in Phase 3.
 */
export class R2AssetStore implements AssetStore {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(options: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
  }) {
    this.bucket = options.bucket;
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${options.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
    });
  }

  async put(key: string, bytes: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: bytes,
        ContentType: contentType,
      }),
    );
  }

  async get(key: string): Promise<{ bytes: Buffer; contentType: string } | null> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      const bytes = Buffer.from(await response.Body!.transformToByteArray());
      return { bytes, contentType: response.ContentType ?? "application/octet-stream" };
    } catch (error) {
      if (error instanceof NoSuchKey) return null;
      throw error;
    }
  }
}
