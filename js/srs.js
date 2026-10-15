/* Aralıklı tekrar: Memrise gibi aşamalı tanıtım + Anki'nin SM-2 planlaması */
(function (w) {
  "use strict";

  var DAY = 86400000;
  var MIN = 60000;

  /* aşamalar: 0 tanışma, 1 çoktan seçmeli, 2 ters çoktan seçmeli, 3 yazma, 4+ tekrar havuzu */
  var STAGE = { MEET: 0, CHOICE: 1, REVERSE: 2, TYPE: 3, REVIEW: 4 };

  function fresh() {
    return { stage: STAGE.MEET, ease: 2.5, interval: 0, due: 0, reps: 0, lapses: 0, seen: 0 };
  }

  function startOfDay(t) {
    var d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime();
  }

  function isNew(p) { return !p || p.reps === 0 && p.stage < STAGE.REVIEW; }
  function isLearning(p) { return !!(p && !p.known && p.stage < STAGE.REVIEW && p.seen > 0); }

  /* kullanıcının "biliyorum" dediği kelime: çalışmaya hiç girmez */
  function isMarked(p) { return !!(p && p.known); }
  /* uygulamada aşamaları bitirip tekrar havuzuna giren kelime */
  function isLearned(p) { return !!(p && !p.known && p.stage >= STAGE.REVIEW && p.interval >= 1); }

  function markKnown(p) {
    p = p || fresh();
    p.known = true;
    p.stage = STAGE.REVIEW;
    p.interval = 0;
    p.due = 0;
    return p;
  }

  function unmark(p) {
    var f = fresh();
    if (p && p.seen) f.seen = p.seen;
    return f;
  }

  function isDue(p, now) {
    if (!p) return false;
    if (p.known) return false;
    if (p.stage < STAGE.REVIEW) return true;
    return p.due <= now;
  }

  /* tanıtım aşamalarında ilerleme */
  function advance(p, correct) {
    p = p || fresh();
    p.seen++;
    if (correct) {
      p.stage++;
      if (p.stage >= STAGE.REVIEW) {
        p.reps = 1;
        p.interval = 1;
        p.due = startOfDay(Date.now()) + DAY;
      }
    } else {
      p.stage = Math.max(STAGE.CHOICE, p.stage - 1);
      p.lapses++;
    }
    return p;
  }

  /* tekrar havuzundaki kart için SM-2 */
  /* grade: 1 tekrar, 2 zor, 3 iyi, 4 kolay */
  function grade(p, g) {
    p = p || fresh();
    p.seen++;
    var now = Date.now();

    if (g === 1) {
      p.lapses++;
      p.ease = Math.max(1.3, p.ease - 0.2);
      p.interval = 0;
      p.stage = STAGE.TYPE;          // baştan değil, bir adım geriye
      p.due = now + 10 * MIN;
      return p;
    }

    p.reps++;
    if (g === 2) {
      p.ease = Math.max(1.3, p.ease - 0.15);
      p.interval = Math.max(1, Math.round((p.interval || 1) * 1.2));
    } else if (g === 3) {
      p.interval = p.interval < 1 ? 1 : Math.round(p.interval * p.ease);
    } else {
      p.ease = Math.min(3.2, p.ease + 0.15);
      p.interval = p.interval < 1 ? 4 : Math.round(p.interval * p.ease * 1.3);
      p.interval = Math.max(p.interval, (p.interval || 1) + 3);
    }
    if (g === 3) p.interval = Math.max(p.interval, 2);
    p.interval = Math.min(p.interval, 365);
    p.stage = STAGE.REVIEW;
    p.due = startOfDay(now) + p.interval * DAY;
    return p;
  }

  /* bir sonraki aralığı insan diline çevir */
  function nextLabel(p, g) {
    var copy = JSON.parse(JSON.stringify(p || fresh()));
    var r = grade(copy, g);
    if (g === 1) return "10 dk";
    if (r.interval < 30) return r.interval + " gün";
    var m = Math.round(r.interval / 30);
    return m + " ay";
  }

  w.SRS = {
    DAY: DAY, STAGE: STAGE, fresh: fresh, advance: advance, grade: grade,
    isNew: isNew, isLearning: isLearning, isLearned: isLearned, isDue: isDue,
    isMarked: isMarked, markKnown: markKnown, unmark: unmark,
    startOfDay: startOfDay, nextLabel: nextLabel
  };
})(window);
