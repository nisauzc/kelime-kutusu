/* Açılış ve olay bağlantıları */
(function (w, d) {
  "use strict";
  var $ = function (s) { return d.querySelector(s); };
  var Store = w.Store, UI = w.UI, CSV = w.CSV;

  function boot() {
    Store.load();

    /* ilk açılışta hazır desteler */
    if (!Store.state.seededStarter && !Store.state.decks.length && w.STARTER) {
      w.STARTER.forEach(function (s) { Store.addDeck(s.name, s.type, s.cards); });
      Store.state.seededStarter = true;
      Store.state.settings.selected = Store.state.decks.length ? [Store.state.decks[0].id] : [];
      Store.save();
    }

    UI.applyTheme();
    UI.show("study");
    wire();
    registerSW();
  }

  function wire() {
    /* sekmeler */
    d.querySelectorAll(".tab").forEach(function (b) {
      b.onclick = function () { UI.show(b.dataset.view); };
    });

    /* tema */
    $("#themeBtn").onclick = function () {
      var cur = d.documentElement.getAttribute("data-theme");
      Store.state.settings.theme = cur === "dark" ? "light" : "dark";
      Store.save();
      UI.applyTheme();
    };

    /* çalış */
    $("#startBtn").onclick = UI.startSession;
    $("#quitBtn").onclick = UI.endSession;
    $("#deckPicker").onclick = function (e) {
      var b = e.target.closest("[data-deck]");
      if (!b) return;
      Store.toggleSelected(b.dataset.deck);
      UI.render();
    };

    /* deste listesi */
    $("#newDeckBtn").onclick = UI.openSheet;
    $("#deckList").onclick = function (e) {
      var c = e.target.closest("[data-open]");
      if (c) UI.openDeck(c.dataset.open);
    };

    /* deste ekleme sayfası */
    $("#sheetClose").onclick = function () { $("#sheet").hidden = true; };
    $("#sheet").onclick = function (e) { if (e.target === $("#sheet")) $("#sheet").hidden = true; };
    d.querySelectorAll("#typeChips .chip").forEach(function (b) {
      b.onclick = function () {
        d.querySelectorAll("#typeChips .chip").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        UI.setType(b.dataset.type);
      };
    });
    $("#csvFile").onchange = function () {
      var f = this.files && this.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        UI.takeText(String(r.result), f.name.replace(/\.(csv|txt|tsv)$/i, ""));
      };
      r.onerror = function () { UI.toast("Dosya okunamadı"); };
      r.readAsText(f, "utf-8");
    };
    $("#pasteToggle").onclick = function () {
      var a = $("#pasteArea");
      a.hidden = !a.hidden;
      if (!a.hidden) a.focus();
    };
    $("#pasteArea").oninput = function () {
      if (this.value.trim().length > 3) UI.takeText(this.value, "");
    };
    $("#saveDeckBtn").onclick = UI.saveDeck;

    /* deste detayı */
    $("#dsClose").onclick = function () { $("#deckSheet").hidden = true; };
    $("#deckSheet").onclick = function (e) { if (e.target === $("#deckSheet")) $("#deckSheet").hidden = true; };
    $("#dsSearch").oninput = function () { UI.drawWords(this.value); };
    $("#dsWords").onclick = function (e) {
      var b = e.target.closest("[data-card]");
      if (b) UI.toggleKnown(b.dataset.card);
    };
    $("#dsKnowAll").onclick = UI.knowAllShown;

    /* takip çizelgesi */
    d.querySelectorAll("[data-range]").forEach(function (b) {
      b.onclick = function () { UI.setRange(b.dataset.range); };
    });
    $("#trackBars").onclick = function (e) {
      var b = e.target.closest(".tb");
      if (b) UI.pickBar(+b.dataset.i);
    };
    $("#dsRename").onclick = function () {
      var dk = Store.deck(UI.currentDeck());
      if (!dk) return;
      var name = w.prompt("Yeni ad", dk.name);
      if (name && name.trim()) { dk.name = name.trim(); Store.save(); $("#dsTitle").textContent = dk.name; UI.render(); }
    };
    $("#dsReset").onclick = function () {
      Store.resetDeck(UI.currentDeck());
      UI.drawWords($("#dsSearch").value);
      UI.toast("İlerleme sıfırlandı");
      UI.render();
    };
    $("#dsDelete").onclick = function () {
      var dk = Store.deck(UI.currentDeck());
      if (!dk) return;
      if (!$("#dsDelete").dataset.armed) {
        $("#dsDelete").dataset.armed = "1";
        $("#dsDelete").textContent = "Gerçekten sil";
        setTimeout(function () {
          delete $("#dsDelete").dataset.armed;
          $("#dsDelete").textContent = "Desteyi sil";
        }, 4000);
        return;
      }
      Store.removeDeck(dk.id);
      delete $("#dsDelete").dataset.armed;
      $("#dsDelete").textContent = "Desteyi sil";
      $("#deckSheet").hidden = true;
      UI.toast("Deste silindi");
      UI.render();
    };

    /* ayarlar */
    $("#setNew").onchange = function () {
      Store.state.settings.newPerDay = Math.max(1, Math.min(100, +this.value || 15));
      this.value = Store.state.settings.newPerDay; Store.save();
    };
    $("#setSession").onchange = function () {
      Store.state.settings.sessionSize = Math.max(5, Math.min(200, +this.value || 25));
      this.value = Store.state.settings.sessionSize; Store.save();
    };
    $("#setTyping").onchange = function () { Store.state.settings.typing = this.checked; Store.save(); };
    $("#setSound").onchange = function () { Store.state.settings.sound = this.checked; Store.save(); };

    $("#exportBtn").onclick = function () {
      var blob = new Blob([Store.exportJSON()], { type: "application/json" });
      var a = d.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "kelime-kutusu-yedek-" + Store.today() + ".json";
      d.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    };
    $("#importFile").onchange = function () {
      var f = this.files && this.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try { Store.importJSON(String(r.result)); UI.applyTheme(); UI.show("study"); UI.toast("Yedek yüklendi"); }
        catch (e) { UI.toast(e.message || "Yedek okunamadı"); }
      };
      r.readAsText(f, "utf-8");
      this.value = "";
    };

    $("#wipeBtn").onclick = function () { $("#wipeConfirm").hidden = false; };
    $("#wipeNo").onclick = function () { $("#wipeConfirm").hidden = true; };
    $("#wipeYes").onclick = function () {
      Store.wipe(); $("#wipeConfirm").hidden = true;
      UI.applyTheme(); UI.show("study"); UI.toast("Her şey silindi");
    };

    /* sistem teması değişirse (kullanıcı seçim yapmadıysa) */
    if (w.matchMedia) {
      w.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
        if (Store.state.settings.theme == null) UI.applyTheme();
      });
    }
  }

  function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    if (location.protocol === "file:") return;
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }

  d.addEventListener("DOMContentLoaded", boot);
})(window, document);
