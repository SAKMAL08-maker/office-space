import { describe, expect, it } from "vitest";
import { downloadDisposition, regionFromEndpoint } from "@/server/storage";

const ODD_NAME = ['a "b"', "Set-Cookie: x;(1)*'é.txt"].join("\r\n");

describe("storage settings", () => {
  it("reads the region from a Backblaze S3 endpoint", () => {
    expect(regionFromEndpoint("https://s3.us-west-004.backblazeb2.com")).toBe("us-west-004");
    expect(regionFromEndpoint("https://s3.eu-central-003.backblazeb2.com/")).toBe("eu-central-003");
    expect(regionFromEndpoint("http://s3.us-west-004.backblazeb2.com")).toBeNull();
    expect(regionFromEndpoint("https://evil.example.com")).toBeNull();
  });

  it("always downloads, and cannot be broken by an odd file name", () => {
    expect(downloadDisposition("plan.pdf")).toBe("attachment; filename*=UTF-8''plan.pdf");
    const prefix = "attachment; filename*=UTF-8''";
    const odd = downloadDisposition(ODD_NAME);
    expect(odd.startsWith(prefix)).toBe(true);
    // Only letters, digits, %-codes and a few safe marks are left after the prefix.
    expect(odd.slice(prefix.length)).toMatch(/^[A-Za-z0-9%._~!-]+$/);
    expect(decodeURIComponent(odd.slice(prefix.length))).toBe(ODD_NAME);
  });
});
