// Server-only: receipt photos live in a DigitalOcean Spaces bucket (S3-compatible). Firebase
// Storage needs the paid Blaze plan, and the keys must never reach the browser, so the browser
// goes through /api/receipts for uploads, signed view links and deletes.
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const VIEW_URL_SECONDS = 10 * 60;

let client: S3Client | null = null;

function config() {
  const key = process.env.DO_SPACES_KEY;
  const secret = process.env.DO_SPACES_SECRET;
  const bucket = process.env.DO_SPACES_BUCKET;
  if (!key || !secret || !bucket) return null;
  const region = process.env.DO_SPACES_REGION || "sfo3";
  return { key, secret, bucket, region };
}

function s3() {
  const c = config();
  if (!c) throw new Error("Receipt storage isn't configured on the server.");
  client ??= new S3Client({
    endpoint: `https://${c.region}.digitaloceanspaces.com`,
    // Spaces ignores the AWS region; the endpoint picks the datacenter
    region: "us-east-1",
    credentials: { accessKeyId: c.key, secretAccessKey: c.secret },
    // Spaces rejects the SDK's default CRC32 checksums on uploads
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return { client, bucket: c.bucket };
}

/** Receipt paths are `receipts/<uid>/<uuid>.jpg`; a user may only touch their own. */
export function ownsReceiptPath(userId: string, path: string): boolean {
  return new RegExp(`^receipts/${userId}/[0-9a-f-]{36}\\.jpg$`).test(path);
}

export async function putReceipt(userId: string, jpeg: Buffer): Promise<string> {
  const { client, bucket } = s3();
  const path = `receipts/${userId}/${crypto.randomUUID()}.jpg`;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: path,
      Body: jpeg,
      ContentType: "image/jpeg",
      ACL: "private",
    }),
  );
  return path;
}

export async function receiptViewUrl(path: string): Promise<string> {
  const { client, bucket } = s3();
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: path }), {
    expiresIn: VIEW_URL_SECONDS,
  });
}

export async function removeReceipt(path: string): Promise<void> {
  const { client, bucket } = s3();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: path }));
}
