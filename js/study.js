/* Oturum kurgusu: hangi kart, hangi soru tipi */
(function (w) {
  "use strict";
  var S = w.SRS;

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* Bir kartın oturumda kaç soru tutacağı: yeni kelime bütün aşamalardan geçer */
  function cost(p, settings) {
    var last = settings.typing ? S.STAGE.REVIEW : S.STAGE.TYPE;
    if (!p) return last;
    if (p.stage < S.STAGE.REVIEW) return Math.max(1, last - p.stage);
    return 1;
  }

  /* Seçili destelerden oturum kuyruğu kurar (soru sayısı bütçeli) */
  function buildQueue(decks, prog, settings, daily, now) {
    now = now || Date.now();
    var due = [], learning = [], fresh = [];

    decks.forEach(function (d) {
      d.cards.forEach(function (c) {
        var p = prog[c.id];
        if (p && p.known) return;                 // "biliyorum" denmiş kelime
        var item = { card: c, deck: d };
        if (!p) { fresh.push(item); return; }
        if (p.stage < S.STAGE.REVIEW) { learning.push(item); return; }
        if (p.due <= now) due.push(item);
      });
    });

    var newLeft = Math.max(0, (settings.newPerDay || 10) - (daily.newDone || 0));
    shuffle(fresh); shuffle(due); shuffle(learning);
    fresh = fresh.slice(0, newLeft);

    var budget = settings.sessionSize || 30;
    var queue = [], spent = 0;
    [learning, due, fresh].forEach(function (group) {
      group.forEach(function (item) {
        var c = cost(prog[item.card.id], settings);
        if (spent + c > budget && queue.length) return;
        queue.push(item); spent += c;
      });
    });
    return queue;
  }

  /* Yanıltıcı seçenekler: önce aynı gruptan, yetmezse desteden */
  function distractors(item, field, n) {
    var cards = item.deck.cards.filter(function (c) { return c.id !== item.card.id && c[field]; });
    var same = cards.filter(function (c) { return c.group && c.group === item.card.group; });
    var pool = shuffle(same.slice()).concat(shuffle(cards.slice()));
    var out = [], seen = {};
    seen[item.card[field].toLowerCase()] = 1;
    for (var i = 0; i < pool.length && out.length < n; i++) {
      var v = pool[i][field], k = v.toLowerCase();
      if (seen[k]) continue;
      seen[k] = 1; out.push(v);
    }
    return out;
  }

  function isJa(deck) { return deck.type === "ja-tr" || deck.type === "ja-en"; }

  /* Bir kart için soruyu üretir */
  function makeQuestion(item, prog, settings) {
    var p = prog[item.card.id];
    var stage = p ? p.stage : S.STAGE.MEET;
    var ja = isJa(item.deck);

    if (stage === S.STAGE.MEET) return { kind: "meet", item: item, ja: ja };

    if (stage === S.STAGE.CHOICE || stage === S.STAGE.REVERSE) {
      var reverse = stage === S.STAGE.REVERSE;
      var askField = reverse ? "meaning" : "term";
      var ansField = reverse ? "term" : "meaning";
      var wrong = distractors(item, ansField, 3);
      if (wrong.length < 2) return { kind: "type", item: item, ja: ja, target: targetFor(item, ja), thin: true };
      var opts = shuffle([item.card[ansField]].concat(wrong));
      return {
        kind: "choice", item: item, ja: ja, reverse: reverse,
        ask: item.card[askField],
        askReading: reverse ? "" : item.card.reading,
        answer: item.card[ansField],
        options: opts,
        optionsAreJa: ja && ansField === "term"
      };
    }

    if (stage === S.STAGE.TYPE) {
      if (!settings.typing) return { kind: "choice-skip", item: item, ja: ja };
      return { kind: "type", item: item, ja: ja, target: targetFor(item, ja) };
    }

    return { kind: "review", item: item, ja: ja };
  }

  /* Yazma adımında ne yazılacak: Japonca destelerde okunuş, diğerlerinde kelimenin kendisi */
  function targetFor(item, ja) {
    if (ja && item.card.reading) return { text: item.card.reading, label: "okunuşunu yaz" };
    if (ja) return { text: item.card.meaning, label: "anlamını yaz" };
    return { text: item.card.term, label: "İngilizcesini yaz" };
  }

  /* Yazım karşılaştırması: büyük/küçük, noktalama ve parantez içini yok sayar */
  function normalize(s) {
    return String(s || "")
      .toLocaleLowerCase("tr")
      .replace(/\(.*?\)/g, " ")
      .replace(/\/[^/]*\//g, " ")
      .replace(/[.,;:!?'"“”‘’\-–—_]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function matches(given, target) {
    var g = normalize(given);
    if (!g) return false;
    var parts = String(target || "").split(/[,;/]| veya /i).map(normalize).filter(Boolean);
    return parts.indexOf(g) >= 0 || normalize(target) === g;
  }

  w.Study = {
    buildQueue: buildQueue, cost: cost, makeQuestion: makeQuestion, matches: matches,
    normalize: normalize, shuffle: shuffle, isJa: isJa
  };
})(window);
