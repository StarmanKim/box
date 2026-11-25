/* 시험 범위 안내 그림: 누르면 화면 전체로 크게 보기 (첫 화면 · PC · 모바일 공통)
 * - 그림을 누르면 ‘크게 보기(원래 크기, 스크롤)’와 ‘화면에 맞추기’가 바뀝니다.
 * - 바깥 어두운 부분을 누르거나 Esc 키를 누르면 닫힙니다.
 * - 브라우저가 지원하면 [전체 화면] 버튼으로 모니터 전체에 띄울 수 있습니다. */
(function () {
  'use strict';
  var SRC = 'img/exam-range.webp';
  var ALT = '2학년 2학기 과학 기말고사 시험 범위. ' +
    'Ⅶ. 전기와 자기(교과서 232~271쪽, 학습지 1~8쪽): (1) 전기 — 두 물체를 마찰하면 어떤 힘이 생길까? 전기를 띤 물체 근처에 가면 어떤 일이 생길까? 전하가 움직이면 어떤 일이 생길까? 전압, 전류, 저항은 어떤 관계일까? 저항의 직렬연결과 병렬연결은 무엇이 다를까? 우리는 전기 에너지를 어떻게 이용할까? (2) 자기 — 전류가 흐르는 코일 주변에는 무엇이 생길까? 전류와 자기가 만나 생긴 힘은 어떤 특성이 있을까? ' +
    'Ⅷ. 별과 우주(교과서 272~307쪽, 학습지 1~7쪽): (1) 별 — 별까지의 거리는 어떻게 알 수 있을까? 별의 밝기는 어떻게 나타낼 수 있을까? 별의 색이 다양하게 나타나는 까닭은 무엇일까? (2) 은하와 우주 — 우리은하에는 어떤 천체가 있을까? 우주의 크기는 항상 일정할까? 인류가 우주를 탐사하는 까닭은 무엇일까?';
  var box = null;
  var lastFocus = null;
  var prevOverflow = '';

  function fsOk() {
    try { return !!(document.fullscreenEnabled && box && box.requestFullscreen); } catch (e) { return false; }
  }
  function setZoom(on) {
    if (!box) return;
    box.classList.toggle('zoomed', on);
    var b = box.querySelector('[data-rv="zoom"]');
    if (b) {
      b.textContent = on ? '화면에 맞추기' : '크게 보기';
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }
  function onKey(e) {
    if (!box) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Tab') {
      // 대화상자 안에서만 초점 이동
      var f = box.querySelectorAll('button');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      return;
    }
    // 열려 있는 동안 뒤쪽 앱의 단축키가 동작하지 않도록
    e.stopPropagation();
  }
  function open() {
    if (box) return;
    lastFocus = document.activeElement;
    var touch = false;
    try { touch = matchMedia('(pointer: coarse)').matches; } catch (e) {}
    box = document.createElement('div');
    box.className = 'rv';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', '시험 범위');
    box.innerHTML =
      '<div class="rv-bar">' +
      '<b class="rv-title">📌 시험 범위</b>' +
      '<span class="rv-sp"></span>' +
      '<button type="button" class="rv-btn" data-rv="zoom" aria-pressed="false">크게 보기</button>' +
      '<button type="button" class="rv-btn" data-rv="fs">전체 화면</button>' +
      '<button type="button" class="rv-btn rv-x" data-rv="close" aria-label="닫기">✕</button>' +
      '</div>' +
      '<div class="rv-stage"><img src="' + SRC + '" alt="' + ALT + '"></div>' +
      '<p class="rv-help">' + (touch ? '그림을 누르면 크게 보기 ↔ 화면에 맞추기 · 두 손가락으로 확대할 수도 있어요 · 바깥을 누르면 닫혀요' : '그림을 누르면 크게 보거나 화면에 맞출 수 있어요 · 바깥을 누르거나 Esc 키를 누르면 닫혀요') + '</p>';
    document.body.appendChild(box);
    if (!fsOk() || document.fullscreenElement) box.querySelector('[data-rv="fs"]').remove();
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-rv]');
      if (b) {
        var a = b.getAttribute('data-rv');
        if (a === 'close') close();
        else if (a === 'zoom') setZoom(!box.classList.contains('zoomed'));
        else if (a === 'fs') {
          box.requestFullscreen().catch(function () {});
          b.remove();
        }
        return;
      }
      if (e.target.tagName === 'IMG') { setZoom(!box.classList.contains('zoomed')); return; }
      if (e.target.classList.contains('rv-stage') || e.target === box) close();
    });
    window.addEventListener('keydown', onKey, true);
    prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(function () {
      if (box) box.classList.add('in');
    });
    box.querySelector('[data-rv="close"]').focus();
  }
  function close() {
    if (!box) return;
    var el = box;
    box = null;
    window.removeEventListener('keydown', onKey, true);
    document.documentElement.style.overflow = prevOverflow;
    try { if (document.fullscreenElement === el) document.exitFullscreen().catch(function () {}); } catch (e) {}
    el.remove();
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }
  // 첫 화면(index.html)처럼 앱 밖에서 쓰는 버튼: data-range-open
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-range-open]');
    if (t) {
      e.preventDefault();
      open();
    }
  });
  window.SF_RANGE = { SRC: SRC, ALT: ALT, open: open, close: close, isOpen: function () { return !!box; } };
})();
