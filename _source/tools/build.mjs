import fs from 'node:fs';
import path from 'node:path';
import { Marked } from 'marked';
import yaml from 'js-yaml';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'lessons');
const OUT = path.join(ROOT, 'site');
const SITE_TITLE = '헤르메스반 응용 사례 강의 팩';
const BUILT = process.env.BUILT_AT || new Date().toISOString().slice(0, 10);

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------- markdown renderer ----------
function makeMarked(toc) {
  const m = new Marked({ gfm: true, breaks: false });
  let h2 = 0;
  m.use({
    renderer: {
      heading(text, level, raw) {
        if (level === 2) {
          const id = 'sec-' + (++h2);
          toc.push({ id, text: raw });
          return `<h2 id="${id}">${text}</h2>\n`;
        }
        return `<h${level}>${text}</h${level}>\n`;
      },
      code(code, lang) {
        lang = (lang || '').trim();
        if (lang === 'flow') {
          const steps = code.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
            const [a, ...b] = l.split('|');
            return { t: a.trim(), d: b.join('|').trim() };
          });
          return `<ol class="flow">${steps.map((s, i) => `<li><span class="fn">${i + 1}</span><b>${esc(s.t)}</b>${s.d ? `<span class="fd">${esc(s.d)}</span>` : ''}</li>`).join('')}</ol>\n`;
        }
        const label = lang === 'prompt' ? '텔레그램 · 내 봇에게' : (lang === 'bash' || lang === 'sh' || lang === 'shell') ? '서버 터미널' : (lang || '코드');
        const cls = lang === 'prompt' ? 'blk prompt' : 'blk code';
        return `<div class="${cls}"><div class="bh"><span>${esc(label)}</span><button class="copy" type="button">복사</button></div><pre><code>${esc(code)}</code></pre></div>\n`;
      },
      link(href, title, text) {
        const ext = /^https?:/.test(href || '');
        return `<a href="${esc(href)}"${title ? ` title="${esc(title)}"` : ''}${ext ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`;
      },
      table(header, body) {
        return `<div class="tbl"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>\n`;
      },
    },
  });
  return m;
}

function parseLesson(file) {
  const raw = fs.readFileSync(path.join(SRC, file), 'utf8').replace(/^\uFEFF/, '');
  const mm = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!mm) throw new Error('frontmatter missing: ' + file);
  const fm = yaml.load(mm[1]);
  if (fm.source_date instanceof Date) fm.source_date = fm.source_date.toISOString().slice(0, 10);
  const body = mm[2];
  const toc = [];
  const html = makeMarked(toc).parse(body);
  const summary = (body.match(/## 한 줄 요약\s*\n+([\s\S]*?)\n##/) || [, ''])[1].trim().replace(/\s+/g, ' ');
  return { ...fm, file, slug: file.replace(/\.md$/, ''), html, toc, summary, chars: body.length };
}

// ---------- layout ----------
const FONT = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">';
function page({ title, desc, body, depth = 0, active = '' }) {
  const up = depth ? '../' : '';
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc || SITE_TITLE)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc || SITE_TITLE)}">
${FONT}
<link rel="stylesheet" href="${up}assets/style.css">
</head>
<body>
<header class="top"><div class="wrap topin">
<a class="brand" href="${up}index.html"><span class="mark">H</span>${SITE_TITLE}</a>
<nav><a href="${up}index.html"${active === 'home' ? ' class="on"' : ''}>홈</a><a href="${up}lessons/index.html"${active === 'lessons' ? ' class="on"' : ''}>교재 10편</a><a href="${up}all.html"${active === 'all' ? ' class="on"' : ''}>통합본</a><a href="${up}cases.html"${active === 'cases' ? ' class="on"' : ''}>사례 모음</a></nav>
</div></header>
${body}
<footer class="foot"><div class="wrap">
<p>${SITE_TITLE} · 바이브코딩 특별반 3기 헤르메스반 보조 교재 · 수집 기간 2026-09-25 ~ 2026-11-25 · 빌드 ${BUILT}</p>
<p>원문 게시물의 저작권은 각 작성자에게 있습니다. 교재는 짧은 인용과 링크로만 원문을 소개하며, 게시물 속 수치는 작성자 주장입니다.</p>
</div></footer>
<script src="${up}assets/app.js"></script>
</body>
</html>`;
}

const tierLabel = { S: 'S 바로 활용', A: 'A 확장', B: 'B 트렌드' };
function chips(l) {
  return `<div class="chips"><span class="chip t${esc(l.tier)}">${esc(tierLabel[l.tier] || l.tier)}</span><span class="chip">${esc(l.session)}</span><span class="chip">${esc(l.duration)}</span><span class="chip">${esc(l.level)}</span></div>`;
}
function card(l, up = '') {
  return `<a class="card" href="${up}lessons/${l.slug}.html"><div class="cno">${String(l.no).padStart(2, '0')}</div><div class="cbody"><div class="ctitle">${esc(l.title)}</div><div class="csub">${esc(l.subtitle)}</div>${chips(l)}<div class="csrc">${esc(l.source_author)} · ${esc(String(l.source_date).slice(0, 10))}</div></div></a>`;
}

// ---------- build ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'lessons'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'md'), { recursive: true });
for (const f of ['style.css', 'app.js']) fs.copyFileSync(path.join(ROOT, 'tools', f), path.join(OUT, 'assets', f));

const lessons = fs.readdirSync(SRC).filter((f) => /^\d\d-.*\.md$/.test(f)).sort().map(parseLesson);
for (const l of lessons) fs.copyFileSync(path.join(SRC, l.file), path.join(OUT, 'md', l.file));
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'meta.json'), 'utf8'));

// lesson pages
lessons.forEach((l, i) => {
  const prev = lessons[i - 1], next = lessons[i + 1];
  const body = `<main class="wrap lesson">
<aside class="side"><div class="sideIn">
<div class="sideK">교재 ${String(l.no).padStart(2, '0')} / ${lessons.length}</div>
<ol class="toc">${l.toc.map((t) => `<li><a href="#${t.id}">${esc(t.text)}</a></li>`).join('')}</ol>
<div class="sideTools"><button class="btn" type="button" onclick="window.print()">인쇄 · PDF</button><a class="btn" href="../md/${l.file}" download>마크다운</a></div>
</div></aside>
<article class="doc">
<div class="crumb"><a href="index.html">교재 10편</a> / ${String(l.no).padStart(2, '0')}</div>
<h1>${esc(l.title)}</h1>
<p class="lede">${esc(l.subtitle)}</p>
${chips(l)}
<div class="srcline">원본 사례: <a href="${esc(l.source_url)}" target="_blank" rel="noopener">${esc(l.source_author)} · ${esc(String(l.source_date).slice(0, 10))}</a></div>
${l.html}
<nav class="pn">${prev ? `<a href="${prev.slug}.html"><span>이전</span>${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a class="nx" href="${next.slug}.html"><span>다음</span>${esc(next.title)}</a>` : '<span></span>'}</nav>
</article>
</main>`;
  fs.writeFileSync(path.join(OUT, 'lessons', l.slug + '.html'), page({ title: `${String(l.no).padStart(2, '0')}. ${l.title} | ${SITE_TITLE}`, desc: l.summary, body, depth: 1, active: 'lessons' }));
});

// lessons index
fs.writeFileSync(path.join(OUT, 'lessons', 'index.html'), page({
  title: '교재 10편 | ' + SITE_TITLE, depth: 1, active: 'lessons',
  body: `<main class="wrap"><section class="sec"><h1 class="pageH">교재 10편</h1><p class="lede">강의 적합도 상위 10개 사례를 하나씩 풀어 쓴 교재입니다. 각 교재는 원본 사례, 구조도, 따라 하기 실습, 미션, 체크리스트, 강사 노트로 구성됩니다.</p><div class="cards">${lessons.map((l) => card(l, '../')).join('')}</div></section></main>`,
}));

// all-in-one
fs.writeFileSync(path.join(OUT, 'all.html'), page({
  title: '통합본 | ' + SITE_TITLE, active: 'all',
  body: `<main class="wrap"><article class="doc wide">
<h1>${SITE_TITLE} 통합본</h1>
<p class="lede">교재 10편을 한 페이지에 모았습니다. 브라우저 인쇄로 PDF 교재를 만들 수 있습니다.</p>
<div class="sideTools"><button class="btn" type="button" onclick="window.print()">전체 인쇄 · PDF</button></div>
<ol class="alltoc">${lessons.map((l) => `<li><a href="#L${l.no}">${String(l.no).padStart(2, '0')}. ${esc(l.title)}</a> <span class="muted">${esc(l.session)}</span></li>`).join('')}</ol>
${lessons.map((l) => `<section class="allL" id="L${l.no}"><div class="crumb">교재 ${String(l.no).padStart(2, '0')}</div><h1>${esc(l.title)}</h1><p class="lede">${esc(l.subtitle)}</p>${chips(l)}<div class="srcline">원본 사례: <a href="${esc(l.source_url)}" target="_blank" rel="noopener">${esc(l.source_author)} · ${esc(String(l.source_date).slice(0, 10))}</a></div>${l.html.replace(/id="sec-/g, `id="L${l.no}-sec-`)}</section>`).join('')}
</article></main>`,
}));

// cases page
const cases = meta.cases;
const cats = [...new Set(cases.map((c) => c.cat))];
fs.writeFileSync(path.join(OUT, 'cases.html'), page({
  title: '사례 모음 | ' + SITE_TITLE, active: 'cases',
  body: `<main class="wrap"><section class="sec">
<h1 class="pageH">수집 사례 모음</h1>
<p class="lede">2026-09-25 ~ 11-25, X(트위터)에서 Hermes Agent 관련 게시물 ${meta.collected}건을 모아 실제 활용 사례 48건을 골랐고, 교재를 위해 안전·운영 사례 6건을 더했습니다. 교재로 만든 사례에는 표시가 있습니다.</p>
<div class="filters" id="filters"><button class="on" data-c="all">전체 ${cases.length}</button>${cats.map((c) => `<button data-c="${esc(c)}">${esc(c)} ${cases.filter((x) => x.cat === c).length}</button>`).join('')}</div>
<div class="tbl"><table class="cases"><thead><tr><th>분야</th><th>날짜</th><th>사례</th><th>출처</th></tr></thead><tbody>
${cases.map((c) => `<tr data-c="${esc(c.cat)}"><td class="nowrap">${esc(c.cat)}</td><td class="nowrap num">${esc(c.date.slice(5))}</td><td>${esc(c.sum)}${c.lesson ? ` <a class="tag" href="lessons/${c.lesson}.html">교재</a>` : ''}</td><td class="nowrap"><a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.who)}</a></td></tr>`).join('')}
</tbody></table></div>
<p class="note">요약은 원문을 한국어로 줄인 것입니다. 수치와 효과는 작성자 주장이며 검증하지 않았습니다.</p>
</section></main>`,
}));

// home
const stages = meta.stages;
const totalMin = lessons.reduce((a, l) => a + (parseInt(l.duration) || 0), 0);
fs.writeFileSync(path.join(OUT, 'index.html'), page({
  title: SITE_TITLE, active: 'home', desc: 'Hermes Agent 실제 응용 사례 10편으로 만든 헤르메스반 강의 교재',
  body: `<main>
<section class="hero"><div class="wrap">
<div class="eyebrow">바이브코딩 특별반 3기 · 헤르메스반 보조 교재</div>
<h1>남들은 헤르메스로<br>무엇을 하고 있을까</h1>
<p class="lede">최근 두 달(2026-09-25 ~ 11-25) X에 올라온 Hermes Agent 게시물 ${meta.collected}건에서 실제 활용 사례를 골랐고, 그중 우리 수업과 가장 잘 맞는 10건을 교재로 만들었습니다.</p>
<div class="stats">
<div><b data-n="${meta.collected}">${meta.collected}</b><span>수집 게시물</span></div>
<div><b data-n="${meta.cases.length}">${meta.cases.length}</b><span>정리한 사례</span></div>
<div><b data-n="${lessons.length}">${lessons.length}</b><span>교재</span></div>
<div><b data-n="${totalMin}">${totalMin}</b><span>총 수업 분량(분)</span></div>
</div>
<div class="cta"><a class="btn pri" href="lessons/index.html">교재 보기</a><a class="btn" href="all.html">통합본 · 인쇄</a></div>
</div></section>

<section class="wrap sec">
<h2 class="secH">수업 흐름 위의 교재 배치</h2>
<p class="muted">헤르메스반에서 배운 흐름(텔레그램 봇, 서버, 크론잡, 승인, 버퍼 예약, 서버 지키기)에 교재를 얹었습니다.</p>
<div class="map">${stages.map((s) => {
    const ls = lessons.filter((l) => (s.ids || []).includes(l.id));
    return `<div class="stage"><div class="sk">${esc(s.k)}</div><div class="sn">${esc(s.n)}</div>${ls.map((l) => `<a class="mini t${l.tier}" href="lessons/${l.slug}.html"><span>${String(l.no).padStart(2, '0')}</span>${esc(l.title)}</a>`).join('') || '<div class="muted small">기존 수업 내용</div>'}</div>`;
  }).join('<div class="arrow" aria-hidden="true"></div>')}</div>
</section>

<section class="wrap sec">
<h2 class="secH">교재 10편</h2>
<div class="cards">${lessons.map((l) => card(l)).join('')}</div>
</section>

<section class="wrap sec two">
<div><h2 class="secH">강사용 사용법</h2>
<ol class="plain">
<li>오프닝에 해당 교재의 <b>원본 사례</b>와 <b>구조도</b>를 화면 공유합니다.</li>
<li><b>실습</b>의 프롬프트는 복사 버튼으로 그대로 텔레그램에 붙여 넣게 합니다.</li>
<li>시간이 부족하면 <b>기본 미션</b>만 하고 도전 미션은 과제로 돌립니다.</li>
<li>교재마다 <b>강사 노트</b>에 시간 배분과 예상 질문이 있습니다.</li>
</ol></div>
<div><h2 class="secH">수강생용 사용법</h2>
<ol class="plain">
<li>프롬프트는 내 봇에게 보내기 전에 꺾쇠 괄호 부분을 내 정보로 바꿉니다.</li>
<li>모든 자동화는 <b>미리보기 후 통과</b> 규칙을 유지합니다.</li>
<li>체크리스트는 이 브라우저에 저장됩니다.</li>
<li>인쇄 버튼으로 PDF 교재를 만들 수 있습니다.</li>
</ol></div>
</section>

<section class="wrap sec">
<h2 class="secH">어떻게 골랐나</h2>
<div class="method">
<div><b>1. 수집</b><span>X 검색 13개 쿼리(한국어·영어·일본어·중국어), 2026-09-25 이후 게시물 ${meta.collected}건</span></div>
<div><b>2. 선별</b><span>팁·뉴스·잡담을 빼고 실제로 무언가를 한 사례 48건, 교재용 안전·운영 사례 6건 추가</span></div>
<div><b>3. 채점</b><span>커리큘럼 연관 40% · 재현 쉬움 25% · 국내 맥락 20% · 시연 임팩트 15%</span></div>
<div><b>4. 교재화</b><span>상위 10건의 원문 스레드, 링크된 글, 공식 문서를 확인해 실습형 교재로 재구성</span></div>
</div>
<p class="note">채점은 헤르메스반 5차시 자료의 흐름에 맞춘 주관적 평가입니다. Hermes Agent 명령어는 공식 문서(hermes-agent.nousresearch.com/docs)와 대조했고, 확인하지 못한 부분은 교재에 표시했습니다.</p>
</section>
</main>`,
}));

fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
console.log(JSON.stringify(lessons.map((l) => ({ no: l.no, id: l.id, chars: l.chars, toc: l.toc.length })), null, 0));
