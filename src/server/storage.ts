import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// The private Backblaze B2 bucket, reached through its S3-compatible API. Nothing here is public:
// browsers only ever get links that stop working after LINK_SECONDS.

export const LINK_SECONDS = 5 * 60;

// Every upload is stored as plain bytes marked "download". The upload link signs these exact
// headers, so a browser cannot store a file that would open as a web page instead.
export const UPLOAD_HEADERS = {
  "Content-Type": "application/octet-stream",
  "Content-Disposition": "attachment",
} as const;

type Storage = { client: S3Client; bucket: string };

let storage: Storage | undefined;

/** Region is part of the endpoint: https://s3.<region>.backblazeb2.com */
export function regionFromEndpoint(endpoint: string): string | null {
  const match = /^https:\/\/s3\.([a-z0-9-]+)\.backblazeb2\.com\/?$/.exec(endpoint);
  return match ? match[1] : null;
}

function getStorage(): Storage {
  if (storage) return storage;

  const { B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET, B2_ENDPOINT } = process.env;
  if (!B2_KEY_ID || !B2_APPLICATION_KEY || !B2_BUCKET || !B2_ENDPOINT) {
    throw new Error("File storage is not set up: a B2_ setting is missing");
  }
  const region = regionFromEndpoint(B2_ENDPOINT);
  if (!region) throw new Error("B2_ENDPOINT should look like https://s3.<region>.backblazeb2.com");

  const client = new S3Client({
    endpoint: B2_ENDPOINT,
    region,
    credentials: { accessKeyId: B2_KEY_ID, secretAccessKey: B2_APPLICATION_KEY },
    // Newer SDK versions add checksums by default, which Backblaze does not accept on signed links.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  storage = { client, bucket: B2_BUCKET };
  return storage;
}

/**
 * A link the browser can PUT one file to, with UPLOAD_HEADERS, for the next few minutes.
 * The size is part of the signature, so the link cannot be reused for a bigger file.
 */
export function signUpload(key: string, size: number): Promise<string> {
  const { client, bucket } = getStorage();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentLength: size,
    ContentType: UPLOAD_HEADERS["Content-Type"],
    ContentDisposition: UPLOAD_HEADERS["Content-Disposition"],
  });
  return getSignedUrl(client, command, {
    expiresIn: LINK_SECONDS,
    signableHeaders: new Set(["content-length", "content-type", "content-disposition"]),
  });
}

/**
 * "attachment" makes the browser save the file rather than show it. The name is percent-encoded
 * (RFC 6266), so quotes, line breaks or non-English letters in it cannot break the header.
 */
export function downloadDisposition(fileName: string): string {
  const encoded = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename*=UTF-8''${encoded}`;
}

/** A link that downloads one file under its original name, for the next few minutes. */
export function signDownload(key: string, fileName: string): Promise<string> {
  const { client, bucket } = getStorage();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentDisposition: downloadDisposition(fileName),
    ResponseContentType: UPLOAD_HEADERS["Content-Type"],
  });
  return getSignedUrl(client, command, { expiresIn: LINK_SECONDS });
}

/** The stored file's size in bytes, or null when there is no file under that key. */
export async function storedSize(key: string): Promise<number | null> {
  const { client, bucket } = getStorage();
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return head.ContentLength ?? null;
  } catch (error) {
    if ((error as { name?: string }).name === "NotFound") return null;
    throw error;
  }
}

export async function deleteStored(key: string): Promise<void> {
  const { client, bucket } = getStorage();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
