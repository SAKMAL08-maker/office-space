// Lets browsers on the given sites send files straight to the Backblaze bucket, and fetch them.
// Run it once after creating the bucket, and again if the site's address changes:
//
//   node --env-file=.env.local scripts/set-bucket-cors.mjs https://office-space-tawny.vercel.app http://localhost:3000
//
// It reads the B2_ settings from the environment and never prints them.

import { GetBucketCorsCommand, PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

const origins = process.argv.slice(2);
if (origins.length === 0 || origins.some((origin) => !/^https?:\/\/[^/]+$/.test(origin))) {
  console.error("Give the site addresses, like https://example.vercel.app (no slash at the end).");
  process.exit(1);
}

const { B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET, B2_ENDPOINT } = process.env;
if (!B2_KEY_ID || !B2_APPLICATION_KEY || !B2_BUCKET || !B2_ENDPOINT) {
  console.error("Set B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET and B2_ENDPOINT first.");
  process.exit(1);
}
const region = /^https:\/\/s3\.([a-z0-9-]+)\.backblazeb2\.com\/?$/.exec(B2_ENDPOINT)?.[1];
if (!region) {
  console.error("B2_ENDPOINT should look like https://s3.<region>.backblazeb2.com");
  process.exit(1);
}

const client = new S3Client({
  endpoint: B2_ENDPOINT,
  region,
  credentials: { accessKeyId: B2_KEY_ID, secretAccessKey: B2_APPLICATION_KEY },
});

try {
  await client.send(
    new PutBucketCorsCommand({
      Bucket: B2_BUCKET,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: origins,
            AllowedMethods: ["PUT", "GET", "HEAD"],
            // The upload link signs exactly these headers.
            AllowedHeaders: ["content-type", "content-disposition"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    }),
  );
  const saved = await client.send(new GetBucketCorsCommand({ Bucket: B2_BUCKET }));
  console.log("Saved. The bucket now accepts browser uploads from:");
  for (const rule of saved.CORSRules ?? []) console.log(" ", rule.AllowedOrigins?.join(", "));
} catch (error) {
  console.error(`Backblaze refused: ${error.name}: ${error.message}`);
  if (error.name === "AccessDenied") {
    console.error("This key may not change bucket settings. See docs/HANDOFF.md, Backblaze setup.");
  }
  process.exit(1);
}
