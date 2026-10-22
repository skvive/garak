// 가락한상 개발명세서 Markdown -> .docx (OOXML 직접 생성, 외부 의존성 없음)
// 1단계: node scripts/md2docx.mjs  -> docs/_docx_staging/ 에 OOXML 파트 생성
// 2단계: powershell -ExecutionPolicy Bypass -File scripts/md2docx.ps1 -> .docx 패키징
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// 사용법: node scripts/md2docx.mjs [입력md] [스테이징디렉토리]
const mdPath = process.argv[2] ?? join(__dirname, '..', 'docs', 'SPEC.md');
const stage = process.argv[3] ?? join(__dirname, '..', 'docs', '_docx_staging');

// ---------- OOXML 헬퍼 ----------
let COMPACT = false; // @@compact 지시문 시 단간·축소 여백 모드
const xmlEsc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// 인라인 파싱: **bold**, `code` 지원. 파트 배열 [{t:'b'|'c'|'n', text}]
const parseInline = (s) => {
  const parts = [];
  const re = /(\*\*.+?\*\*|`[^`]+`)/g;
  let last = 0;
  for (const m of s.matchAll(re)) {
    if (m.index > last) parts.push({ t: 'n', text: s.slice(last, m.index) });
    if (m[0].startsWith('**')) parts.push({ t: 'b', text: m[0].slice(2, -2) });
    else parts.push({ t: 'c', text: m[0].slice(1, -1) });
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push({ t: 'n', text: s.slice(last) });
  return parts;
};

const runXml = (text, { bold = false, code = false, color = null, sz = COMPACT ? 19 : 21 } = {}) => {
  const rPr = [];
  rPr.push('<w:rFonts w:ascii="Malgun Gothic" w:hAnsi="Malgun Gothic" w:eastAsia="Malgun Gothic" w:cs="Malgun Gothic"/>');
  if (bold) rPr.push('<w:b/>');
  if (color) rPr.push(`<w:color w:val="${color}"/>`);
  rPr.push(`<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>`);
  return `<w:r><w:rPr>${rPr.join('')}</w:rPr><w:t xml:space="preserve">${xmlEsc(text)}</w:t></w:r>`;
};

const inlineRuns = (text, base = {}) => {
  if (!text) return '';
  return parseInline(text)
    .map((p) => {
      if (p.t === 'b') return runXml(p.text, { ...base, bold: true });
      if (p.t === 'c') return runXml(p.text, { ...base, sz: base.sz ? base.sz - 2 : 19 }).replace('w:ascii="Malgun Gothic"', 'w:ascii="Consolas"').replace('w:hAnsi="Malgun Gothic"', 'w:hAnsi="Consolas"');
      return runXml(p.text, base);
    })
    .join('');
};

const para = ({ runs = '', pPr = '' } = {}) =>
  `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ''}${runs}</w:p>`;

const spacer = (before, after) => `<w:spacing w:before="${COMPACT ? Math.round(before / 4) : before}" w:after="${COMPACT ? Math.round(after / 4) : after}" w:line="${COMPACT ? 240 : 300}" w:lineRule="auto"/>`;
const pBdrBottom = (color, sz) => `<w:pBdr><w:bottom w:val="single" w:sz="${sz}" w:space="4" w:color="${color}"/></w:pBdr>`;
const pBdrBox = (color) =>
  `<w:pBdr><w:top w:val="single" w:sz="4" w:color="${color}"/><w:left w:val="single" w:sz="4" w:color="${color}"/><w:bottom w:val="single" w:sz="4" w:color="${color}"/><w:right w:val="single" w:sz="4" w:color="${color}"/></w:pBdr>`;
const pBdrLeft = (color, sz) => `<w:pBdr><w:left w:val="single" w:sz="${sz}" w:space="8" w:color="${color}"/></w:pBdr>`;
const shd = (fill) => `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>`;

// ---------- 블록 파서 ----------
const lines = readFileSync(mdPath, 'utf8').replace(/\r\n/g, '\n').split('\n');
const body = [];
let i = 0;
let inCode = false;
let codeBuf = [];

const flushCode = () => {
  const text = codeBuf.join('\n');
  const runs = `<w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:eastAsia="Malgun Gothic"/><w:sz w:val="${COMPACT ? 18 : 19}"/><w:szCs w:val="${COMPACT ? 18 : 19}"/></w:rPr><w:t xml:space="preserve">${xmlEsc(text)}</w:t></w:r>`;
  body.push(para({ runs, pPr: `${spacer(40, 80)}${shd('F2F2F2')}${pBdrBox('DDDDDD')}` }));
  codeBuf = [];
};

const flushList = (buf, ordered) => {
  if (!buf.length) return;
  buf.forEach((item, idx) => {
    const prefix = ordered ? `${idx + 1}. ` : '\u2022 ';
    body.push(para({ runs: runXml(prefix, {}) + inlineRuns(item, {}), pPr: `<w:ind w:left="420" w:hanging="240"/>${spacer(0, 60)}` }));
  });
  buf.length = 0;
};

let listBuf = [];
let listOrdered = false;

// ---------- 메인 블록 루프 ----------
const CONTENT_W = 9864; // A4(11906) - 좌우 여백 2*1021

const emitTable = (rows) => {
  const nCols = rows[0].length;
  const colW = Math.floor(CONTENT_W / nCols);
  const grid = `<w:tblGrid>${Array.from({ length: nCols }, () => `<w:gridCol w:w="${colW}"/>`).join('')}</w:tblGrid>`;
  const borders = `<w:tblBorders><w:top w:val="single" w:sz="4" w:color="888888"/><w:left w:val="single" w:sz="4" w:color="888888"/><w:bottom w:val="single" w:sz="4" w:color="888888"/><w:right w:val="single" w:sz="4" w:color="888888"/><w:insideH w:val="single" w:sz="4" w:color="888888"/><w:insideV w:val="single" w:sz="4" w:color="888888"/></w:tblBorders>`;
  const cellMar = `<w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="85" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="85" w:type="dxa"/></w:tblCellMar>`;
  const trs = rows
    .map((row, ri) => {
      const isHead = ri === 0;
      const tcs = row
        .map((cell) => {
          const tcPr = `<w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/>${isHead ? shd('E8F0F8') : ''}</w:tcPr>`;
          return `<w:tc>${tcPr}${para({ runs: inlineRuns(cell, { bold: isHead }), pPr: spacer(0, 0) })}</w:tc>`;
        })
        .join('');
      return `<w:tr>${isHead ? '<w:trPr><w:tblHeader/></w:trPr>' : ''}${tcs}</w:tr>`;
    })
    .join('');
  body.push(`<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>${borders}${cellMar}</w:tblPr>${grid}${trs}</w:tbl>`);
  body.push(para({ pPr: spacer(0, 80) }));
};

let tableBuf = [];
const flushTable = () => {
  if (!tableBuf.length) return;
  const data = tableBuf.map((r) => r.slice(1, -1).map((c) => c.trim()));
  emitTable(data.filter((_, idx) => idx !== 1)); // 구분행(---) 제거
  tableBuf = [];
};

for (; i < lines.length; i++) {
  const line = lines[i];

  if (line.trim().startsWith('```')) {
    flushList(listBuf, listOrdered);
    flushTable();
    if (inCode) { flushCode(); inCode = false; } else { inCode = true; }
    continue;
  }
  if (inCode) { codeBuf.push(line); continue; }

  if (/^\|.*\|\s*$/.test(line)) { flushList(listBuf, listOrdered); tableBuf.push(line.split('|')); continue; }
  flushTable();

  if (/^@@compact\s*$/.test(line)) { COMPACT = true; continue; }

  if (/^@@center\s(.+)$/.test(line)) {
    flushList(listBuf, listOrdered);
    body.push(para({ runs: inlineRuns(line.replace(/^@@center\s/, ''), { sz: COMPACT ? 26 : 32, bold: true }), pPr: `<w:jc w:val="center"/>${spacer(0, 200)}` }));
  } else if (/^###\s/.test(line)) {
    flushList(listBuf, listOrdered);
    body.push(para({ runs: runXml(line.replace(/^###\s/, ''), { bold: true, color: '00539C', sz: COMPACT ? 21 : 24 }), pPr: `<w:keepNext/><w:outlineLvl w:val="2"/>${spacer(160, 80)}` }));
  } else if (/^##\s/.test(line)) {
    flushList(listBuf, listOrdered);
    body.push(para({ runs: runXml(line.replace(/^##\s/, ''), { bold: true, color: '00539C', sz: COMPACT ? 24 : 28 }), pPr: `<w:keepNext/><w:outlineLvl w:val="1"/>${spacer(200, 100)}${pBdrBottom('999999', 6)}` }));
  } else if (/^#\s/.test(line)) {
    flushList(listBuf, listOrdered);
    body.push(para({ runs: runXml(line.replace(/^#\s/, ''), { bold: true, color: '00539C', sz: COMPACT ? 30 : 36 }), pPr: `<w:keepNext/><w:outlineLvl w:val="0"/>${spacer(0, 160)}${pBdrBottom('00539C', 12)}` }));
  } else if (/^---\s*$/.test(line)) {
    flushList(listBuf, listOrdered);
    body.push(para({ pPr: `${pBdrBottom('CCCCCC', 6)}${spacer(80, 80)}` }));
  } else if (/^>\s?/.test(line)) {
    flushList(listBuf, listOrdered);
    body.push(para({ runs: inlineRuns(line.replace(/^>\s?/, ''), { color: '333333' }), pPr: `<w:ind w:left="240"/>${spacer(40, 80)}${shd('F5F8FB')}${pBdrLeft('00539C', 16)}` }));
  } else if (/^-\s/.test(line)) {
    if (listBuf.length && !listOrdered) listBuf.push(line.replace(/^-\s/, ''));
    else { flushList(listBuf, listOrdered); listOrdered = false; listBuf.push(line.replace(/^-\s/, '')); }
  } else if (/^\d+\.\s/.test(line)) {
    if (listBuf.length && listOrdered) listBuf.push(line.replace(/^\d+\.\s/, ''));
    else { flushList(listBuf, listOrdered); listOrdered = true; listBuf.push(line.replace(/^\d+\.\s/, '')); }
  } else if (line.trim() === '') {
    flushList(listBuf, listOrdered);
  } else {
    flushList(listBuf, listOrdered);
    body.push(para({ runs: inlineRuns(line, {}), pPr: spacer(0, 80) }));
  }
}
flushTable();
flushList(listBuf, listOrdered);
if (inCode) flushCode();

// ---------- 문서 조립 ----------
const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
${body.join('\n')}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1021" w:bottom="1134" w:left="1021" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>
</w:body>
</w:document>`;

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

mkdirSync(join(stage, 'word'), { recursive: true });
mkdirSync(join(stage, '_rels'), { recursive: true });
writeFileSync(join(stage, 'word', 'document.xml'), documentXml, 'utf8');
writeFileSync(join(stage, '[Content_Types].xml'), contentTypes, 'utf8');
writeFileSync(join(stage, '_rels', '.rels'), rels, 'utf8');
console.log(`OOXML staging written: ${stage} (document.xml ${documentXml.length} chars)`);

