// 置換対象の文字列と置換後の文字列を定義
let replacements = [];
let isEnabled = false;  // デフォルトを無効に変更

// テキストノード内の文字列を置換する関数
function replaceTextInNode(node) {
  if (!isEnabled) return;

  if (node.nodeType === Node.TEXT_NODE) {
    let text = node.textContent;
    let replaced = false;

    // 変換後の文字列が既に含まれている場合はスキップ
    if (replacements.some(replacement => replacement.to && text.includes(replacement.to))) {
      return;
    }

    replacements.forEach(replacement => {
      if (text.includes(replacement.from)) {
        text = text.replace(new RegExp(replacement.from, 'g'), replacement.to);
        replaced = true;
        //console.log('replaced', replacement.from, replacement.to);
      }
    });

    if (replaced) {
      node.textContent = text;
    }
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    // 要素ノードの場合は子ノードを再帰的に処理
    for (const child of node.childNodes) {
      replaceTextInNode(child);
    }
  }
}

// ページ読み込み時の処理
console.log('Content script loaded');

// 初期設定を読み込む
chrome.storage.sync.get(['replacements', 'enabledUrls'], function (data) {
  replacements = data.replacements || [];
  const enabledUrls = data.enabledUrls || [];
  isEnabled = enabledUrls.includes(window.location.href);

  // 初期ページのテキストを置換
  replaceTextInNode(document.body);
});

// ページの変更を監視
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    // 追加されたノードを処理
    mutation.addedNodes.forEach(node => {
      replaceTextInNode(node);
    });

    // 変更されたノードを処理
    if (mutation.target.nodeType === Node.TEXT_NODE) {
      replaceTextInNode(mutation.target);
    }
  });
});

// 監視の開始
observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true
});

// メッセージリスナー
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateReplacements') {
    replacements = message.replacements;
    isEnabled = message.enabled;
    // ページ全体を再処理
    replaceTextInNode(document.body);
  } else if (message.action === 'updateEnabled') {
    isEnabled = message.enabled;
    if (isEnabled) {
      // 有効化された場合はページ全体を再処理
      replaceTextInNode(document.body);
    }
  }
}); 