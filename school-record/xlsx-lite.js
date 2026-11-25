/*
 * 외부 라이브러리 없이 .xlsx 명렬표를 읽는 최소 리더
 * - 브라우저 내장 DecompressionStream('deflate-raw') 사용 (최신 Chrome·Edge·Safari·Firefox)
 * - 셀 값(문자열·숫자)만 읽으며, 파일은 서버로 전송되지 않습니다.
 */
(function (global) {
  "use strict";
  const SRM = (global.SRM = global.SRM || {});

  async function inflateRaw(bytes) {
    if (typeof DecompressionStream === "undefined") {
      throw new Error("이 브라우저는 엑셀 파일 읽기를 지원하지 않습니다. 표를 복사해 붙여넣기로 불러오세요.");
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function unzip(buffer) {
    const data = new Uint8Array(buffer);
    const view = new DataView(buffer);
    let eocd = -1;
    for (let i = data.length - 22; i >= Math.max(0, data.length - 65557); i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        eocd = i;
        break;
      }
    }
    if (eocd < 0) throw new Error("엑셀(.xlsx) 파일 형식이 아닙니다.");
    const count = view.getUint16(eocd + 10, true);
    let ptr = view.getUint32(eocd + 16, true);
    const files = {};
    const decoder = new TextDecoder("utf-8");
    for (let n = 0; n < count; n++) {
      if (view.getUint32(ptr, true) !== 0x02014b50) break;
      const method = view.getUint16(ptr + 10, true);
      const csize = view.getUint32(ptr + 20, true);
      const nameLen = view.getUint16(ptr + 28, true);
      const extraLen = view.getUint16(ptr + 30, true);
      const commentLen = view.getUint16(ptr + 32, true);
      const local = view.getUint32(ptr + 42, true);
      const name = decoder.decode(data.subarray(ptr + 46, ptr + 46 + nameLen));
      const lNameLen = view.getUint16(local + 26, true);
      const lExtraLen = view.getUint16(local + 28, true);
      const start = local + 30 + lNameLen + lExtraLen;
      files[name] = { method, raw: data.subarray(start, start + csize) };
      ptr += 46 + nameLen + extraLen + commentLen;
    }
    return {
      has: (name) => !!files[name],
      async text(name) {
        const f = files[name];
        if (!f) return null;
        const bytes = f.method === 8 ? await inflateRaw(f.raw) : f.raw;
        return decoder.decode(bytes);
      },
    };
  }

  function colIndex(ref) {
    const letters = String(ref || "").replace(/[^A-Z]/gi, "").toUpperCase();
    let n = 0;
    for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n - 1;
  }

  function xml(text) {
    return new DOMParser().parseFromString(text, "application/xml");
  }

  function textOf(node) {
    // <si><t>..</t></si> 또는 서식이 섞인 <si><r><t>..</t></r>...</si>
    return [...node.getElementsByTagName("t")].map((t) => t.textContent).join("");
  }

  async function readXlsx(buffer) {
    const zip = await unzip(buffer);
    const wbText = await zip.text("xl/workbook.xml");
    if (!wbText) throw new Error("엑셀 통합문서 정보를 찾을 수 없습니다.");
    const wb = xml(wbText);
    const relsText = (await zip.text("xl/_rels/workbook.xml.rels")) || "";
    const rels = {};
    if (relsText) {
      for (const r of xml(relsText).getElementsByTagName("Relationship")) {
        rels[r.getAttribute("Id")] = r.getAttribute("Target");
      }
    }
    const ssText = await zip.text("xl/sharedStrings.xml");
    const shared = ssText ? [...xml(ssText).getElementsByTagName("si")].map(textOf) : [];

    const sheets = [];
    const sheetNodes = [...wb.getElementsByTagName("sheet")];
    for (let i = 0; i < sheetNodes.length; i++) {
      const node = sheetNodes[i];
      const rid = node.getAttribute("r:id") || node.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
      let target = rels[rid] || `worksheets/sheet${i + 1}.xml`;
      target = target.replace(/^\/?xl\//, "").replace(/^\//, "");
      const sheetText = await zip.text("xl/" + target);
      if (!sheetText) continue;
      const doc = xml(sheetText);
      const rows = [];
      for (const row of doc.getElementsByTagName("row")) {
        const r = [];
        for (const c of row.getElementsByTagName("c")) {
          const idx = colIndex(c.getAttribute("r"));
          const t = c.getAttribute("t");
          let v = "";
          if (t === "s") {
            const vn = c.getElementsByTagName("v")[0];
            v = vn ? shared[Number(vn.textContent)] || "" : "";
          } else if (t === "inlineStr") {
            v = textOf(c);
          } else {
            const vn = c.getElementsByTagName("v")[0];
            v = vn ? vn.textContent : "";
          }
          r[idx >= 0 ? idx : r.length] = String(v).trim();
        }
        rows.push(Array.from(r, (x) => x || ""));
      }
      sheets.push({ name: node.getAttribute("name") || `Sheet${i + 1}`, rows });
    }
    return sheets;
  }

  // CSV(쉼표) 또는 붙여넣은 표(탭) 파싱
  function parseDelimited(text) {
    const src = String(text || "").replace(/^﻿/, "").replace(/\r\n?/g, "\n");
    const delim = src.includes("\t") ? "\t" : ",";
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      if (quoted) {
        if (ch === '"' && src[i + 1] === '"') {
          cell += '"';
          i++;
        } else if (ch === '"') quoted = false;
        else cell += ch;
      } else if (ch === '"' && cell === "") quoted = true;
      else if (ch === delim) {
        row.push(cell.trim());
        cell = "";
      } else if (ch === "\n") {
        row.push(cell.trim());
        rows.push(row);
        row = [];
        cell = "";
      } else cell += ch;
    }
    if (cell || row.length) {
      row.push(cell.trim());
      rows.push(row);
    }
    return rows.filter((r) => r.some((c) => c !== ""));
  }

  SRM.sheet = { readXlsx, parseDelimited };
})(typeof window !== "undefined" ? window : globalThis);
