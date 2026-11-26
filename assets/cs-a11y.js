/* Case studies: text that a splitting animation breaks into letters keeps its full sentence for screen readers.
   SplitText-style splitting puts aria-label on a plain element (a <p>, a <b>, a <div>), which assistive tech ignores
   there. This moves the label into visually hidden text when the visible copy is hidden from them, and drops it
   when the visible copy is still readable. It runs again after resizes, since splitting re-runs then. */
(function () {
  const KEEP = 'a,button,input,select,textarea,svg,img,iframe,section,nav,aside,main,header,footer,form,dialog,[role]';
  function fix() {
    document.querySelectorAll('[aria-label]').forEach(el => {
      if (el.matches(KEEP)) return;
      const label = el.getAttribute('aria-label'); el.removeAttribute('aria-label');
      const visible = [...el.childNodes].some(n => (n.nodeType === 3 && n.textContent.trim()) || (n.nodeType === 1 && n.getAttribute('aria-hidden') !== 'true' && !n.classList.contains('sr-only')));
      if (visible || el.querySelector(':scope > .sr-only')) return;
      const s = document.createElement('span'); s.className = 'sr-only'; s.textContent = label; el.prepend(s);
    });
  }
  let t; const later = () => { clearTimeout(t); t = setTimeout(fix, 400); };
  addEventListener('load', () => { fix(); setTimeout(fix, 1500); setTimeout(fix, 4000); });
  addEventListener('resize', later);
})();
