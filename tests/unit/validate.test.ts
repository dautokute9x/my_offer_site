import { describe, expect, it } from "vitest";
import { validateApplication, sniffFileKind, MAX_CV_BYTES, type ApplicationInput } from "@/lib/validate";

const base: ApplicationInput = { kind: "apply", jobCode: "00412", fullName: "Nguyễn Văn A", email: "", phone: "", facebook: "", jpLevel: "", note: "", consent: true, idempotencyKey: "k", file: { name: "cv.pdf", size: 1000, type: "application/pdf" } };
const p = { ...base, phone: "0901234567" };

describe("validateApplication", () => {
  it("accepts valid phone", () => expect(validateApplication({ ...base, phone: "090 123 4567" })).toEqual({}));
  it("requires a contact", () => expect(validateApplication(base).contact).toBe("Cần ít nhất một cách liên hệ: email, điện thoại/Zalo hoặc Facebook."));
  it("bad email reports email only", () => {
    const e = validateApplication({ ...base, email: "abc" });
    expect(e.email).toBeDefined();
    expect(e.contact).toBeUndefined();
  });
  it("bad phone reports phone", () => expect(validateApplication({ ...base, phone: "12" }).phone).toBeDefined());
  it("consent", () => expect(validateApplication({ ...p, consent: false }).consent).toBeDefined());
  it("file rules", () => {
    expect(validateApplication({ ...p, file: { name: "cv.exe", size: 10, type: "application/x-msdownload" } }).file).toBeDefined();
    expect(validateApplication({ ...p, file: { name: "cv.pdf", size: MAX_CV_BYTES + 1, type: "application/pdf" } }).file).toBeDefined();
    expect(validateApplication({ ...p, file: { name: "cv.pdf", size: 0, type: "application/pdf" } }).file).toBeDefined();
    expect(validateApplication({ ...p, file: null }).file).toBeDefined();
    expect(validateApplication({ ...p, file: { name: "CV.PDF", size: 5, type: "" } })).toEqual({});
    expect(validateApplication({ ...p, file: { name: "a.pdf", size: 5, type: "application/octet-stream" } })).toEqual({});
    expect(validateApplication({ ...p, file: { name: "a.pdf", size: 5, type: "application/msword" } }).file).toBeDefined();
  });
  it("consult", () => expect(validateApplication({ ...base, kind: "consult", jobCode: null, phone: "0901234567", file: null })).toEqual({}));
  it("jobCode", () => {
    expect(validateApplication({ ...p, jobCode: null }).jobCode).toBeDefined();
    expect(validateApplication({ ...p, jobCode: "a-b" }).jobCode).toBeDefined();
  });
  it("kind", () => expect(validateApplication({ ...p, kind: "x" as never }).kind).toBeDefined());
  it("fullName", () => expect(validateApplication({ ...p, fullName: " " }).fullName).toBeDefined());
  it("note", () => expect(validateApplication({ ...p, note: "x".repeat(2001) }).note).toBeDefined());
  it("facebook", () => {
    expect(validateApplication({ ...base, facebook: "https://www.facebook.com/abc" })).toEqual({});
    expect(validateApplication({ ...base, facebook: "nguyen.van.a" })).toEqual({});
    expect(validateApplication({ ...p, facebook: "http://evil.example" }).facebook).toBeDefined();
  });
  it("idempotencyKey", () => expect(validateApplication({ ...p, idempotencyKey: " " }).idempotencyKey).toBeDefined());
});

describe("sniffFileKind", () => {
  it("detects", () => {
    expect(sniffFileKind(new TextEncoder().encode("%PDF-1.7"))).toBe("pdf");
    expect(sniffFileKind(Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))).toBe("ole");
    expect(sniffFileKind(Uint8Array.from([0x50, 0x4b, 0x03, 0x04]))).toBe("zip");
    expect(sniffFileKind(new TextEncoder().encode("MZ"))).toBeNull();
    expect(sniffFileKind(Uint8Array.from([0x25, 0x50]))).toBeNull();
  });
});
