// ChatGPT RTL Fixer (FA/EN)
// Corrects mixed Persian/Arabic (RTL) and English (LTR) text on ChatGPT.
// Assumptions: heuristic detection based on character counts; existing formatting is preserved.
// Quick install: Chrome > Extensions > Developer mode > Load unpacked > select this folder.

(() => {
  const SETTINGS_DEFAULT = {
    enabled: true,
    mode: 'auto', // auto | dir-only | wrap-latin
    skipCode: true,
  };

  let settings = { ...SETTINGS_DEFAULT };

  const BLOCK_SELECTOR = '.markdown, .prose, div[data-message-id], div[data-testid="conversation-turn"]';
  const SKIP_SELECTOR = 'pre,code,kbd,samp,mjx-container,.katex,table,[contenteditable]';
  const rtlRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
  const ltrRegex = /[A-Za-z0-9]/;

  function detectDominantScript(text) {
    let rtl = 0,
      ltr = 0;
    for (const ch of text) {
      if (rtlRegex.test(ch)) rtl++;
      else if (ltrRegex.test(ch)) ltr++;
    }
    return rtl > ltr ? 'rtl' : 'ltr';
  }

  function splitIntoRuns(text) {
    const runs = [];
    let current = { type: null, text: '' };
    for (const ch of text) {
      const type = rtlRegex.test(ch)
        ? 'rtl'
        : ltrRegex.test(ch)
        ? 'ltr'
        : 'neutral';
      if (current.type === type) current.text += ch;
      else {
        if (current.type !== null) runs.push(current);
        current = { type, text: ch };
      }
    }
    if (current.type !== null) runs.push(current);
    return runs;
  }

  function applyDirectionFix(block) {
    if (block.dataset.rtlFixed === '1') return;
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (parent.closest(SKIP_SELECTOR)) return NodeFilter.FILTER_REJECT;
        if (parent.closest('bdi')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const textNodes = [];
    let combined = '';
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
      combined += walker.currentNode.nodeValue;
    }
    if (!textNodes.length) return;

    const dominant = detectDominantScript(combined);
    block.style.direction = dominant === 'rtl' ? 'rtl' : 'ltr';
    block.style.textAlign = 'start';
    block.style.unicodeBidi = 'isolate';

    if (settings.mode === 'dir-only') {
      block.dataset.rtlFixed = '1';
      return;
    }

    textNodes.forEach((node) => {
      const runs = splitIntoRuns(node.nodeValue);
      const frag = document.createDocumentFragment();
      runs.forEach((run) => {
        if (run.type === 'neutral') {
          frag.appendChild(document.createTextNode(run.text));
        } else if (
          dominant === 'rtl' &&
          run.type === 'ltr' &&
          (settings.mode === 'auto' || settings.mode === 'wrap-latin')
        ) {
          const bdi = document.createElement('bdi');
          bdi.setAttribute('dir', 'ltr');
          bdi.textContent = run.text;
          frag.appendChild(bdi);
        } else if (
          dominant === 'ltr' &&
          run.type === 'rtl' &&
          settings.mode === 'auto'
        ) {
          const bdi = document.createElement('bdi');
          bdi.setAttribute('dir', 'rtl');
          bdi.textContent = run.text;
          frag.appendChild(bdi);
        } else {
          frag.appendChild(document.createTextNode(run.text));
        }
      });
      node.parentNode.replaceChild(frag, node);
    });
    block.dataset.rtlFixed = '1';
  }

  let processTimer = null;
  function processAll() {
    if (!settings.enabled) return;
    document.querySelectorAll(BLOCK_SELECTOR).forEach(applyDirectionFix);
  }

  function scheduleProcess() {
    if (!settings.enabled) return;
    clearTimeout(processTimer);
    processTimer = setTimeout(() => {
      (window.requestIdleCallback || ((fn) => setTimeout(fn, 0)))(processAll);
    }, 150);
  }

  function observeMutations() {
    const observer = new MutationObserver((mutations) => {
      if (!settings.enabled) return;
      mutations.forEach((m) => {
        if (m.type === 'childList') {
          m.addedNodes.forEach((n) => {
            if (n.nodeType === 1) {
              n.querySelectorAll &&
                n.querySelectorAll(BLOCK_SELECTOR).forEach((el) =>
                  el.removeAttribute('data-rtl-fixed')
                );
            }
          });
        } else if (m.type === 'characterData') {
          const block =
            m.target.parentElement &&
            m.target.parentElement.closest(BLOCK_SELECTOR);
          if (block) block.removeAttribute('data-rtl-fixed');
        }
      });
      scheduleProcess();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  let lastURL = location.href;
  setInterval(() => {
    if (location.href !== lastURL) {
      lastURL = location.href;
      document
        .querySelectorAll(BLOCK_SELECTOR)
        .forEach((el) => el.removeAttribute('data-rtl-fixed'));
      scheduleProcess();
    }
  }, 1000);

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'settings') {
      settings = { ...settings, ...msg.settings };
      if (settings.enabled) scheduleProcess();
    }
  });

  observeMutations();
  chrome.runtime.sendMessage(
    { type: 'getSettings', host: location.hostname },
    (res) => {
      if (res && res.settings) {
        settings = { ...settings, ...res.settings };
        if (settings.enabled) scheduleProcess();
      }
    }
  );

  // Acceptance tests (manual):
  // 1. Mixed Persian & English: "این یک test ساده است 123".
  // 2. English paragraph with single Persian word: "This is an مثال paragraph.".
  // 3. Code block: `console.log("سلام");` is untouched.
  // 4. New or edited ChatGPT messages auto-correct.
})();
