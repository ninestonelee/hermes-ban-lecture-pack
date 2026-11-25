(function () {
  // copy buttons
  document.querySelectorAll('.blk .copy').forEach(function (b) {
    b.addEventListener('click', function () {
      var code = b.closest('.blk').querySelector('code').innerText;
      var done = function () { b.textContent = '복사됨'; b.classList.add('ok'); setTimeout(function () { b.textContent = '복사'; b.classList.remove('ok'); }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(code).then(done, done); else { var t = document.createElement('textarea'); t.value = code; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); done(); }
    });
  });
  // persistent checklists
  var key = 'hpack:' + location.pathname;
  var boxes = Array.prototype.slice.call(document.querySelectorAll('.doc input[type=checkbox]'));
  var saved = {}; try { saved = JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) {}
  boxes.forEach(function (c, i) { c.disabled = false; c.checked = !!saved[i]; c.addEventListener('change', function () { saved[i] = c.checked; try { localStorage.setItem(key, JSON.stringify(saved)); } catch (e) {} }); });
  // toc scrollspy
  var links = Array.prototype.slice.call(document.querySelectorAll('.toc a'));
  if (links.length && 'IntersectionObserver' in window) {
    var map = {}; links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { links.forEach(function (a) { a.classList.remove('on'); }); var a = map[e.target.id]; if (a) a.classList.add('on'); } });
    }, { rootMargin: '-80px 0px -70% 0px' });
    Object.keys(map).forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
  }
  // case filters
  var f = document.getElementById('filters');
  if (f) f.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    f.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
    var c = b.dataset.c;
    document.querySelectorAll('table.cases tbody tr').forEach(function (tr) { tr.style.display = (c === 'all' || tr.dataset.c === c) ? '' : 'none'; });
  });
  // count-up
  document.querySelectorAll('[data-n]').forEach(function (el) {
    var n = +el.dataset.n, t0 = performance.now();
    (function step(t) { var p = Math.min(1, (t - t0) / 800); el.textContent = Math.round(n * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); })(t0);
  });
})();
