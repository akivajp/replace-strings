// バックグラウンドスクリプトの初期化
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

// メッセージリスナー
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message);
  // メッセージ処理をここに記述
}); 