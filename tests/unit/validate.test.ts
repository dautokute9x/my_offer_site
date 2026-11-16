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

describe("validateApplication hardening", () => {
  const bad = (o: Record<string, unknown>) => validateApplication({ ...p, ...o } as never);
  it("never throws on odd shapes", () => {
    for (const v of [undefined, null, 5, {}, []]) {
      for (const k of ["fullName", "email", "phone", "facebook", "note", "idempotencyKey", "jobCode", "kind"]) {
        expect(() => bad({ [k]: v })).not.toThrow();
      }
    }
    expect(bad({ fullName: undefined }).fullName).toBeDefined();
    expect(bad({ note: 5 })).toBeDefined();
    expect(Object.keys(bad({ phone: undefined, email: null, facebook: 5 }))).toContain("contact");
    expect(() => validateApplication({} as never)).not.toThrow();
  });
  it("file missing type is treated as empty mime", () => expect(bad({ file: { name: "a.pdf", size: 5 } })).toEqual({}));
  it("odd files", () => {
    for (const f of [{ size: 5 }, { name: 5, size: 5, type: 1 }, "x", 7, []]) {
      expect(bad({ file: f }).file).toBeDefined();
    }
    for (const size of [NaN, -1, Infinity, "abc", 1.5]) {
      expect(bad({ file: { name: "a.pdf", size, type: "application/pdf" } }).file).toBeDefined();
    }
  });
  it("file names", () => {
    for (const name of ["cv.pdf.exe", "cv.", ".pdf", "pdf"]) {
      expect(bad({ file: { name, size: 5, type: "" } }).file).toBeDefined();
    }
    for (const name of ["CV.PDF", "hồ sơ.pdf"]) {
      expect(bad({ file: { name, size: 5, type: "" } })).toEqual({});
    }
  });
  it("zip mime for docx/xlsx", () => {
    expect(bad({ file: { name: "a.docx", size: 5, type: "application/zip" } })).toEqual({});
    expect(bad({ file: { name: "a.xlsx", size: 5, type: "application/x-zip-compressed" } })).toEqual({});
    expect(bad({ file: { name: "a.pdf", size: 5, type: "application/zip" } }).file).toBeDefined();
  });
  it("facebook", () => {
    for (const f of ["https://facebook.com.evil.com/x", "https://evil.com/facebook.com", "https://facebook.com@evil.com", "javascript:alert(1)", "//evil.com", "<script>", "a\nb"]) {
      expect(bad({ facebook: f }).facebook).toBeDefined();
    }
    for (const f of ["https://www.facebook.com/nguyen.van.a", "nguyen.van.a", "https://facebook.com/profile.php?id=123", "https://fb.com/abc"]) {
      expect(bad({ facebook: f }).facebook).toBeUndefined();
    }
  });
  it("phone", () => {
    expect(bad({ phone: "++84" }).phone).toBeDefined();
    expect(bad({ phone: "abc123456789" }).phone).toBeDefined();
    expect(bad({ phone: "+84 90 123 4567" })).toEqual({});
  });
  it("consent and jpLevel", () => {
    expect(bad({ consent: "false" }).consent).toBeDefined();
    expect(bad({ consent: "true" }).consent).toBeDefined();
    expect(bad({ jpLevel: "N9" }).jpLevel).toBeDefined();
    expect(bad({ jpLevel: "N3" })).toEqual({});
    expect(bad({ jpLevel: "none" })).toEqual({});
  });
});
