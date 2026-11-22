import { describe, expect, it } from "vitest";
import { buildCsvText } from "./csvExport";

describe("csv export", () => {
  it("writes a header, rows and a byte order mark", () => {
    expect(buildCsvText(["Code", "Name"], [["A1", "Sandal"]])).toBe("﻿Code,Name\r\nA1,Sandal\r\n");
  });

  it("quotes commas, quotes and line breaks", () => {
    expect(buildCsvText(["Name"], [['Men "Pro", black'], ["two\nlines"]])).toBe('﻿Name\r\n"Men ""Pro"", black"\r\n"two\nlines"\r\n');
  });

  it("protects text that a spreadsheet would run as a formula but keeps numbers", () => {
    expect(buildCsvText(["x"], [["=SUM(A1)"], ["-5 off"], [-5], [null], [undefined]])).toBe("﻿x\r\n'=SUM(A1)\r\n'-5 off\r\n-5\r\n\r\n\r\n");
  });
});
