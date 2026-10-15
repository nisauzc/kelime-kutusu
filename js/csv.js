/* CSV okuma: ayracı kendi bulur, tırnaklı alanları anlar, Anki'nin # satırlarını atlar */
(function (w) {
  "use strict";

  function detectSep(text) {
    var line = text.split(/\r?\n/).find(function (l) {
      return l.trim() && l.trim()[0] !== "#";
    }) || "";
    var counts = { "\t": 0, ";": 0, ",": 0 };
    var inQ = false;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (c === '"') inQ = !inQ;
      else if (!inQ && counts[c] !== undefined) counts[c]++;
    }
    if (counts["\t"]) return "\t";
    if (counts[";"] >= counts[","]) return counts[";"] ? ";" : ",";
    return ",";
  }

  function parse(text, sep) {
    text = String(text).replace(/^﻿/, "");
    sep = sep || detectSep(text);
    var rows = [], row = [], field = "", inQ = false, i = 0;
    while (i < text.length) {
      var c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQ = false; i++; continue;
        }
        field += c; i++; continue;
      }
      if (c === '"') { inQ = true; i++; continue; }
      if (c === sep) { row.push(field); field = ""; i++; continue; }
      if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); rows.push(row); row = []; field = ""; i++; continue;
      }
      field += c; i++;
    }
    row.push(field);
    if (row.length > 1 || row[0].trim()) rows.push(row);
    return rows.filter(function (r) {
      var first = (r[0] || "").trim();
      if (first[0] === "#") return false;             // Anki yönerge satırları
      return r.some(function (x) { return x && x.trim(); });
    });
  }

  function clean(s) {
    return String(s == null ? "" : s)
      .replace(/<br\s*\/?>/gi, " ")                   // Anki kartlarındaki satır sonu
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  var HEAD = /^(kelime|word|term|front|ön|on|anlam|meaning|back|arka|türkçe|turkce|telaffuz|okunuş|okunus|reading|pronunciation|grup|group|tag|etiket|japonca|japanese)$/i;

  function looksLikeHeader(row) {
    var hits = row.filter(function (c) { return HEAD.test(clean(c)); }).length;
    return hits >= Math.max(2, Math.ceil(row.length / 2));
  }

  /* Satırları karta çevirir: kelime, anlam, telaffuz, grup */
  function toCards(text) {
    var rows = parse(text);
    if (!rows.length) return { cards: [], skipped: 0, hadHeader: false };
    var hadHeader = looksLikeHeader(rows[0]);
    if (hadHeader) rows = rows.slice(1);

    var cards = [], skipped = 0, seen = Object.create(null);
    rows.forEach(function (r) {
      var term = clean(r[0]), meaning = clean(r[1]);
      if (!term || !meaning) { skipped++; return; }
      var key = term.toLowerCase() + "|" + meaning.toLowerCase();
      if (seen[key]) { skipped++; return; }
      seen[key] = 1;
      cards.push({
        term: term,
        meaning: meaning,
        reading: clean(r[2]),
        group: clean(r[3])
      });
    });
    return { cards: cards, skipped: skipped, hadHeader: hadHeader };
  }

  w.CSV = { parse: parse, toCards: toCards, clean: clean, detectSep: detectSep };
})(window);
