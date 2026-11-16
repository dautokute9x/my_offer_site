import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/csv";

describe("parseCsv", () => {
  it("bỏ BOM, nhận CRLF và LF, bỏ dòng trống cuối", () => {
    expect(parseCsv("﻿a,b\r\n1,2\n3,4\r\n\r\n")).toEqual([["a", "b"], ["1", "2"], ["3", "4"]]);
  });
  it("ô có dấu phẩy, ngoặc kép và xuống dòng", () => {
    expect(parseCsv('a,"x, y","he said ""hi""","l1\nl2"\n')).toEqual([["a", "x, y", 'he said "hi"', "l1\nl2"]]);
  });
  it("ô rỗng và dòng cuối không có xuống dòng", () => {
    expect(parseCsv("a,,c\n,,x")).toEqual([["a", "", "c"], ["", "", "x"]]);
  });
  it("chuỗi rỗng → không dòng nào", () => expect(parseCsv("")).toEqual([]));
});
