/* Arayüz: görünümler, deste ekleme, çalışma oturumu */
(function (w, d) {
  "use strict";
  var S = w.SRS, St = w.Study, Store = w.Store, CSV = w.CSV;
  var $ = function (s) { return d.querySelector(s); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  };

  var UI = {};
  var view = "study";
  var sess = null;
  var draft = { type: "en-tr", cards: [] };
  var openDeckId = null;

  /* ---------------- bildirim ---------------- */
  var toastTimer;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }
  UI.toast = toast;

  /* ---------------- tema ---------------- */
  function applyTheme() {
    var set = Store.state.settings.theme;
    var dark = set === "dark" || (set == null &&
      w.matchMedia && w.matchMedia("(prefers-color-scheme: dark)").matches);
    d.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    $("#themeIcon").innerHTML = dark ? "&#9788;" : "&#9789;";
  }
  UI.applyTheme = applyTheme;

  /* ---------------- görünüm değiştirme ---------------- */
  function show(name) {
    view = name;
    ["study", "decks", "stats", "settings"].forEach(function (v) {
      $("#view-" + v).hidden = v !== name;
    });
    d.querySelectorAll(".tab").forEach(function (b) {
      b.classList.toggle("active", b.dataset.view === name);
    });
    render();
    w.scrollTo(0, 0);
  }
  UI.show = show;

  /* ---------------- çizim ---------------- */
  function render() {
    if (view === "study") renderStudy();
    if (view === "decks") renderDecks();
    if (view === "stats") renderStats();
    if (view === "settings") renderSettings();
  }
  UI.render = render;

  function typeLabel(t) {
    return t === "ja-tr" ? "Japonca → Türkçe" : t === "ja-en" ? "Japonca → İngilizce" : "İngilizce → Türkçe";
  }

  function renderStudy() {
    var st = Store.state;
    var decks = Store.selectedDecks();
    var c = Store.counts(decks);
    var all = Store.counts(st.decks);

    $("#streakNum").textContent = st.streak.count;
    $("#cntNew").textContent = Math.max(0, Math.min(c.nw, (st.settings.newPerDay || 10) - st.daily.newDone));
    $("#cntDue").textContent = c.due;
    $("#cntLearned").textContent = all.known;

    var picker = $("#deckPicker");
    if (!st.decks.length) {
      picker.innerHTML = '<div class="empty"><b>Henüz deste yok</b>CSV yükleyerek ilk desteni ekle.</div>';
      $("#hello").textContent = "Hoş geldin";
      $("#todaySub").textContent = "Önce bir deste ekle, sonra başlayalım.";
      $("#startBtn").disabled = true;
      $("#startHint").textContent = "";
      return;
    }

    picker.innerHTML = st.decks.map(function (dk) {
      var on = st.settings.selected.indexOf(dk.id) >= 0;
      var dc = Store.counts([dk]);
      return '<button type="button" class="pick' + (on ? " on" : "") + '" data-deck="' + esc(dk.id) + '">' +
        '<span class="box">' + (on ? "&#10003;" : "") + "</span>" +
        '<span class="nm">' + esc(dk.name) + "</span>" +
        '<span class="badge">' + dc.due + " tekrar · " + dc.nw + " yeni</span></button>";
    }).join("");

    var todo = c.due + Math.min(c.nw, Math.max(0, (st.settings.newPerDay || 10) - st.daily.newDone));
    $("#hello").textContent = todo ? "Bugün " + todo + " kelime seni bekliyor" : "Bugünlük bitti";
    $("#todaySub").textContent = todo
      ? "Hazırsan başlayalım."
      : "Yeni kelime sınırını artırabilir ya da yarın devam edebilirsin.";
    $("#startBtn").disabled = todo === 0;
    $("#startHint").textContent = todo === 0 && c.nw > 0
      ? "Bu destede öğrenilmemiş " + c.nw + " kelime var, günlük sınır dolduğu için bekliyor."
      : "";
  }

  function renderDecks() {
    var st = Store.state;
    var list = $("#deckList");
    if (!st.decks.length) {
      list.innerHTML = '<div class="empty"><b>Deste yok</b>Yukarıdaki düğmeden CSV yükle.</div>';
      return;
    }
    list.innerHTML = st.decks.map(function (dk) {
      var c = Store.counts([dk]);
      var pct = c.total ? Math.round((c.known / c.total) * 100) : 0;
      var ja = St.isJa(dk);
      return '<div class="card deck-card" data-open="' + esc(dk.id) + '">' +
        '<span class="face' + (ja ? " ja" : "") + '">' + (ja ? "JA" : "EN") + "</span>" +
        '<span class="meta"><b>' + esc(dk.name) + "</b>" +
        "<small>" + c.total + " kelime · " + typeLabel(dk.type) + "</small>" +
        '<span class="mini-bar"><i style="width:' + pct + '%"></i></span></span>' +
        '<span class="badge">' + pct + "%</span></div>";
    }).join("");
  }

  function renderStats() {
    var st = Store.state;
    var c = Store.counts(st.decks);
    var pct = c.total ? Math.round((c.known / c.total) * 100) : 0;
    $("#ringPct").textContent = pct + "%";
    $("#ringFg").style.strokeDashoffset = String(327 - (327 * pct) / 100);
    $("#statLegend").innerHTML =
      '<span><i style="background:var(--mint)"></i>' + c.known + " biliniyor</span>" +
      '<span><i style="background:var(--accent-2)"></i>' + c.learning + " öğreniliyor</span>" +
      '<span><i style="background:var(--line)"></i>' + c.nw + " yeni</span>";

    var f = Store.forecast(7);
    var max = Math.max.apply(null, f.concat([1]));
    var names = ["Bugün", "Yarın"];
    $("#forecast").innerHTML = f.map(function (n, i) {
      var dt = new Date(Date.now() + i * S.DAY);
      var lbl = i < 2 ? names[i] : ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"][dt.getDay()];
      return '<div class="fc"><b>' + (n || "") + '</b><i style="height:' +
        Math.round((n / max) * 100) + '%"></i><small>' + lbl + "</small></div>";
    }).join("");

    $("#statDecks").innerHTML = st.decks.length ? st.decks.map(function (dk) {
      var dc = Store.counts([dk]);
      var p = dc.total ? Math.round((dc.known / dc.total) * 100) : 0;
      return '<div class="sd"><span class="nm">' + esc(dk.name) + "</span>" +
        '<span class="mini-bar" style="flex:0 0 90px"><i style="width:' + p + '%"></i></span>' +
        "<b>" + p + "%</b></div>";
    }).join("") : '<p class="hint">Deste yok.</p>';
  }

  function renderSettings() {
    var s = Store.state.settings;
    $("#setNew").value = s.newPerDay;
    $("#setSession").value = s.sessionSize;
    $("#setTyping").checked = !!s.typing;
    $("#setSound").checked = !!s.sound;
  }

  /* ---------------- deste ekleme ---------------- */
  function openSheet() {
    draft = { type: "en-tr", cards: [] };
    $("#deckName").value = "";
    $("#pasteArea").value = "";
    $("#pasteArea").hidden = true;
    $("#previewBox").hidden = true;
    $("#sheetErr").hidden = true;
    $("#saveDeckBtn").disabled = true;
    $("#csvFile").value = "";
    d.querySelectorAll("#typeChips .chip").forEach(function (b) {
      b.classList.toggle("active", b.dataset.type === "en-tr");
    });
    updateCsvHelp();
    $("#sheet").hidden = false;
  }
  UI.openSheet = openSheet;

  function updateCsvHelp() {
    var map = {
      "en-tr": "kelime , anlam , telaffuz",
      "ja-tr": "japonca , türkçe anlam , okunuş (romaji)",
      "ja-en": "japonca , english meaning , okunuş (romaji)"
    };
    $("#csvCols").textContent = map[draft.type];
    $("#pasteArea").placeholder = draft.type === "en-tr"
      ? "shelf, raf, /ŞELF/\ndrawer, çekmece, /DROR/"
      : "水, su, mizu\n本, kitap, hon";
  }
  UI.updateCsvHelp = updateCsvHelp;

  function setType(t) {
    draft.type = t;
    updateCsvHelp();
  }
  UI.setType = setType;

  function takeText(text, suggestName) {
    var res;
    try { res = CSV.toCards(text); }
    catch (e) { return fail("Dosya okunamadı."); }
    if (!res.cards.length) return fail("Hiç kelime bulunamadı. En az iki sütun gerekiyor: kelime ve anlam.");
    draft.cards = res.cards;
    $("#sheetErr").hidden = true;
    $("#saveDeckBtn").disabled = false;
    if (suggestName && !$("#deckName").value.trim()) $("#deckName").value = suggestName;

    $("#previewCount").textContent = res.cards.length + " kelime okundu" +
      (res.skipped ? " · " + res.skipped + " satır atlandı" : "");
    $("#previewTable").innerHTML = res.cards.slice(0, 5).map(function (c) {
      return "<tr><td>" + esc(c.term) + "</td><td>" + esc(c.meaning) + "</td><td>" + esc(c.reading) + "</td></tr>";
    }).join("");
    $("#previewBox").hidden = false;

    function fail(msg) {
      $("#sheetErr").textContent = msg; $("#sheetErr").hidden = false;
      $("#saveDeckBtn").disabled = true; $("#previewBox").hidden = true;
    }
  }
  UI.takeText = takeText;

  function saveDeck() {
    var name = $("#deckName").value.trim() || "Yeni deste";
    if (!draft.cards.length) return;
    Store.addDeck(name, draft.type, draft.cards);
    $("#sheet").hidden = true;
    toast(draft.cards.length + " kelime eklendi");
    show("decks");
  }
  UI.saveDeck = saveDeck;

  /* ---------------- deste detayı ---------------- */
  function openDeck(id) {
    var dk = Store.deck(id);
    if (!dk) return;
    openDeckId = id;
    $("#dsTitle").textContent = dk.name;
    $("#dsSearch").value = "";
    drawWords("");
    $("#deckSheet").hidden = false;
  }
  UI.openDeck = openDeck;
  UI.currentDeck = function () { return openDeckId; };

  function drawWords(q) {
    var dk = Store.deck(openDeckId);
    if (!dk) return;
    q = St.normalize(q);
    var ja = St.isJa(dk);
    var rows = dk.cards.filter(function (c) {
      if (!q) return true;
      return St.normalize(c.term).indexOf(q) >= 0 ||
        St.normalize(c.meaning).indexOf(q) >= 0 ||
        St.normalize(c.reading).indexOf(q) >= 0;
    });
    $("#dsWords").innerHTML = rows.slice(0, 400).map(function (c) {
      var p = Store.prog(c.id);
      var cls = S.isKnown(p) ? "known" : (p ? "learning" : "");
      return '<div class="dw"><span class="s ' + cls + '"></span>' +
        '<span class="t' + (ja ? " jp" : "") + '">' + esc(c.term) + "</span>" +
        '<span class="m">' + esc(c.meaning) + (c.reading ? " · " + esc(c.reading) : "") + "</span></div>";
    }).join("") || '<p class="hint">Eşleşen kelime yok.</p>';
  }
  UI.drawWords = drawWords;

  /* ---------------- çalışma oturumu ---------------- */
  function startSession() {
    var decks = Store.selectedDecks();
    var q = St.buildQueue(decks, Store.state.prog, Store.state.settings, Store.state.daily);
    if (!q.length) { toast("Şimdilik çalışacak kelime yok"); return; }
    var planned = q.reduce(function (n, it) {
      return n + St.cost(Store.prog(it.card.id), Store.state.settings);
    }, 0);
    sess = { queue: q, idx: 0, total: planned, right: 0, wrong: 0, newSeen: 0 };
    $("#session").hidden = false;
    d.body.style.overflow = "hidden";
    nextCard();
  }
  UI.startSession = startSession;

  function endSession() {
    $("#session").hidden = true;
    d.body.style.overflow = "";
    sess = null;
    render();
  }
  UI.endSession = endSession;

  function bar() {
    $("#sessionBar").style.width = ((sess.idx / sess.total) * 100) + "%";
    $("#sessionCount").textContent = Math.min(sess.idx + 1, sess.total) + "/" + sess.total;
  }

  function nextCard() {
    if (!sess) return;
    if (sess.idx >= sess.queue.length) return finish();
    bar();
    var item = sess.queue[sess.idx];
    var q = St.makeQuestion(item, Store.state.prog, Store.state.settings);
    if (q.kind === "choice-skip") {           // yazma kapalıysa bu adımı atla
      var p = Store.prog(item.card.id) || S.fresh();
      Store.setProg(item.card.id, S.advance(p, true));
      sess.idx++; return nextCard();
    }
    drawQuestion(q);
  }

  function markNew(item) {
    if (!Store.prog(item.card.id)) {
      Store.state.daily.newDone++;
      sess.newSeen++;
      Store.save();
    }
  }

  function beep(ok) {
    if (!Store.state.settings.sound) return;
    try {
      var ac = beep.ctx || (beep.ctx = new (w.AudioContext || w.webkitAudioContext)());
      var o = ac.createOscillator(), g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.frequency.value = ok ? 660 : 200;
      g.gain.setValueAtTime(0.07, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.18);
      o.start(); o.stop(ac.currentTime + 0.18);
    } catch (e) {}
  }

  function drawQuestion(q) {
    var st = $("#stage");
    var c = q.item.card;
    var jp = q.ja ? " jp" : "";

    if (q.kind === "meet") {
      st.innerHTML =
        '<p class="q-kind">YENİ KELİME</p>' +
        '<div class="prompt"><span class="new-flag">tanışma</span>' +
        '<div class="term' + jp + '">' + esc(c.term) + "</div>" +
        (c.reading ? '<div class="read">' + esc(c.reading) + "</div>" : "") +
        '<div class="mean">' + esc(c.meaning) + "</div>" +
        (c.group ? '<div class="grp">' + esc(c.group) + "</div>" : "") +
        "</div>" +
        '<div class="next-btn"><button class="big-btn" id="goNext" type="button">Anladım</button></div>';
      $("#goNext").onclick = function () {
        markNew(q.item);
        Store.setProg(c.id, S.advance(Store.prog(c.id) || S.fresh(), true));
        keepLearning(q.item);
        sess.idx++; nextCard();
      };
      return;
    }

    if (q.kind === "choice") {
      st.innerHTML =
        '<p class="q-kind">' + (q.reverse ? "HANGİSİ?" : "ANLAMI NE?") + "</p>" +
        '<div class="prompt"><div class="term' + (q.reverse ? "" : jp) + '">' + esc(q.ask) + "</div>" +
        (q.askReading ? '<div class="read">' + esc(q.askReading) + "</div>" : "") + "</div>" +
        '<div class="opts">' + q.options.map(function (o, i) {
          return '<button class="opt' + (q.optionsAreJa ? " jp" : "") + '" type="button" data-i="' + i + '">' + esc(o) + "</button>";
        }).join("") + "</div>" +
        '<div id="fb"></div>';
      st.querySelectorAll(".opt").forEach(function (b) {
        b.onclick = function () {
          var ok = q.options[+b.dataset.i] === q.answer;
          st.querySelectorAll(".opt").forEach(function (x) {
            x.disabled = true;
            if (q.options[+x.dataset.i] === q.answer) x.classList.add("right");
          });
          if (!ok) b.classList.add("wrong");
          afterAnswer(q, ok);
        };
      });
      return;
    }

    if (q.kind === "type") {
      var ask = q.ja ? c.term : c.meaning;
      st.innerHTML =
        '<p class="q-kind">' + q.target.label.toLocaleUpperCase("tr") + "</p>" +
        '<div class="prompt"><div class="term' + (q.ja ? jp : "") + '">' + esc(ask) + "</div>" +
        (q.ja && c.meaning !== q.target.text ? '<div class="mean">' + esc(c.meaning) + "</div>" : "") + "</div>" +
        '<div class="typing"><input type="text" id="typeIn" autocomplete="off" autocapitalize="off" ' +
        'autocorrect="off" spellcheck="false" placeholder="buraya yaz">' +
        '<button class="big-btn" id="checkBtn" type="button">Kontrol et</button></div>' +
        '<div id="fb"></div>';
      var inp = $("#typeIn");
      inp.focus();
      function check() {
        var ok = St.matches(inp.value, q.target.text);
        inp.classList.add(ok ? "right" : "wrong");
        inp.disabled = true; $("#checkBtn").hidden = true;
        afterAnswer(q, ok, q.target.text);
      }
      $("#checkBtn").onclick = check;
      inp.onkeydown = function (e) { if (e.key === "Enter") check(); };
      return;
    }

    /* tekrar kartı */
    st.innerHTML =
      '<p class="q-kind">TEKRAR</p>' +
      '<div class="prompt"><div class="term' + jp + '">' + esc(c.term) + "</div>" +
      '<div class="mean" id="rev" hidden>' + esc(c.meaning) +
      (c.reading ? ' <span class="read">' + esc(c.reading) + "</span>" : "") + "</div></div>" +
      '<div class="next-btn" id="revealWrap"><button class="big-btn" id="revealBtn" type="button">Cevabı göster</button></div>';
    $("#revealBtn").onclick = function () {
      $("#rev").hidden = false;
      var p = Store.prog(c.id);
      $("#revealWrap").outerHTML =
        '<div class="grade">' +
        '<button class="g1" data-g="1">Tekrar<small>' + S.nextLabel(p, 1) + "</small></button>" +
        '<button class="g2" data-g="2">Zor<small>' + S.nextLabel(p, 2) + "</small></button>" +
        '<button class="g3" data-g="3">İyi<small>' + S.nextLabel(p, 3) + "</small></button>" +
        '<button class="g4" data-g="4">Kolay<small>' + S.nextLabel(p, 4) + "</small></button></div>";
      st.querySelectorAll(".grade button").forEach(function (b) {
        b.onclick = function () {
          var g = +b.dataset.g;
          Store.setProg(c.id, S.grade(Store.prog(c.id) || S.fresh(), g));
          if (g === 1) { sess.wrong++; requeue(q.item); } else sess.right++;
          beep(g !== 1);
          sess.idx++; nextCard();
        };
      });
    };
  }

  function afterAnswer(q, ok, showAnswer) {
    markNew(q.item);
    beep(ok);
    if (ok) sess.right++; else sess.wrong++;
    Store.setProg(q.item.card.id, S.advance(Store.prog(q.item.card.id) || S.fresh(), ok));
    keepLearning(q.item);
    var fb = $("#fb");
    fb.className = "feedback " + (ok ? "ok" : "no");
    fb.innerHTML = (ok ? "Doğru" : "Olmadı") +
      (!ok && showAnswer ? '<span class="answer">' + esc(showAnswer) + "</span>" : "");
    var btn = d.createElement("div");
    btn.className = "next-btn";
    btn.innerHTML = '<button class="big-btn" type="button">Devam</button>';
    btn.querySelector("button").onclick = function () { sess.idx++; nextCard(); };
    btn.querySelector("button").focus();
    $("#stage").appendChild(btn);
  }

  /* kartı birkaç soru sonra yeniden kuyruğa sok */
  function requeue(item, gap) {
    gap = gap || 4;
    var at = Math.min(sess.idx + 1 + gap, sess.queue.length);
    sess.queue.splice(at, 0, item);
    if (sess.queue.length > sess.total) sess.total = sess.queue.length;
  }

  /* tanıtım aşamaları bitmediyse kart aynı oturumda devam eder */
  function keepLearning(item) {
    var p = Store.prog(item.card.id);
    if (!p || p.stage >= S.STAGE.REVIEW) return;
    if (!Store.state.settings.typing && p.stage >= S.STAGE.TYPE) return;
    requeue(item, 3);
  }

  function finish() {
    Store.markStudied();
    var toplam = sess.right + sess.wrong;
    var oran = toplam ? Math.round((sess.right / toplam) * 100) : 0;
    $("#stage").innerHTML =
      '<div class="done"><div class="em">&#9733;</div>' +
      '<div class="big">Oturum bitti</div>' +
      "<p>" + sess.right + " doğru · " + sess.wrong + " kaçtı · %" + oran + "</p>" +
      (sess.newSeen ? "<p class=\"hint\">" + sess.newSeen + " yeni kelimeyle tanıştın.</p>" : "") +
      '<p class="hint">Seri: ' + Store.state.streak.count + " gün</p>" +
      '<div class="btn-row" style="justify-content:center">' +
      '<button class="pill-btn" id="againBtn" type="button">Devam et</button>' +
      '<button class="big-btn" id="doneBtn" type="button" style="width:auto;padding:.7rem 1.4rem">Bitir</button>' +
      "</div></div>";
    $("#sessionBar").style.width = "100%";
    $("#doneBtn").onclick = endSession;
    $("#againBtn").onclick = function () { endSession(); startSession(); };
  }

  w.UI = UI;
})(window, document);
