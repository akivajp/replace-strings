document.addEventListener('DOMContentLoaded', function() {
  const rulesContainer = document.getElementById('rules-container');
  const addRuleButton = document.getElementById('addRule');
  const saveRulesButton = document.getElementById('saveRules');
  const toggleButton = document.getElementById('toggleReplace');
  const currentUrlElement = document.getElementById('currentUrl');
  
  let currentTab = null;
  let isEnabled = false;  // デフォルトを無効に変更
  
  // 現在のタブのURLを取得
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    currentTab = tabs[0];
    currentUrlElement.textContent = `現在のURL: ${currentTab.url}`;
    
    // このページの設定を読み込む
    chrome.storage.sync.get(['replacements', 'enabledUrls'], function(data) {
      const replacements = data.replacements || [];
      const enabledUrls = data.enabledUrls || [];
      
      // 置換ルールを表示
      replacements.forEach(rule => addRuleElement(rule.from, rule.to));
      
      // このページが有効化されているかチェック
      isEnabled = enabledUrls.includes(currentTab.url);
      updateToggleButton();
    });
  });
  
  // トグルボタンの状態を更新
  function updateToggleButton() {
    if (isEnabled) {
      toggleButton.textContent = 'このページで置換を無効化';
      toggleButton.className = 'toggle-button active';
    } else {
      toggleButton.textContent = 'このページで置換を有効化';
      toggleButton.className = 'toggle-button inactive';
    }
  }
  
  // トグルボタンのイベントリスナー
  toggleButton.addEventListener('click', function() {
    chrome.storage.sync.get('enabledUrls', function(data) {
      const enabledUrls = data.enabledUrls || [];
      const url = currentTab.url;
      
      if (isEnabled) {
        // 無効化する
        const index = enabledUrls.indexOf(url);
        if (index > -1) {
          enabledUrls.splice(index, 1);
        }
      } else {
        // 有効化する
        if (!enabledUrls.includes(url)) {
          enabledUrls.push(url);
        }
      }
      
      chrome.storage.sync.set({ enabledUrls: enabledUrls }, function() {
        isEnabled = !isEnabled;
        updateToggleButton();
        
        // コンテンツスクリプトにメッセージを送信
        chrome.tabs.sendMessage(currentTab.id, {
          action: 'updateEnabled',
          enabled: isEnabled
        });
      });
    });
  });
  
  // ルール要素を追加する関数
  function addRuleElement(from = '', to = '') {
    const ruleDiv = document.createElement('div');
    ruleDiv.className = 'replacement-rule';
    
    const fromInput = document.createElement('input');
    fromInput.type = 'text';
    fromInput.placeholder = '置換前の文字列';
    fromInput.value = from;
    
    const toInput = document.createElement('input');
    toInput.type = 'text';
    toInput.placeholder = '置換後の文字列';
    toInput.value = to;
    
    const removeButton = document.createElement('button');
    removeButton.className = 'remove-rule';
    removeButton.textContent = '削除';
    removeButton.onclick = function() {
      rulesContainer.removeChild(ruleDiv);
    };
    
    ruleDiv.appendChild(fromInput);
    ruleDiv.appendChild(toInput);
    ruleDiv.appendChild(removeButton);
    rulesContainer.appendChild(ruleDiv);
  }
  
  // ルール追加ボタンのイベントリスナー
  addRuleButton.addEventListener('click', function() {
    addRuleElement();
  });
  
  // 保存ボタンのイベントリスナー
  saveRulesButton.addEventListener('click', function() {
    const rules = [];
    const ruleElements = rulesContainer.getElementsByClassName('replacement-rule');
    
    for (const ruleElement of ruleElements) {
      const inputs = ruleElement.getElementsByTagName('input');
      const from = inputs[0].value.trim();
      const to = inputs[1].value.trim();
      
      if (from && to) {
        rules.push({ from, to });
      }
    }
    
    // ルールを保存
    chrome.storage.sync.set({ replacements: rules }, function() {
      // コンテンツスクリプトにメッセージを送信
      chrome.tabs.sendMessage(currentTab.id, {
        action: 'updateReplacements',
        replacements: rules,
        enabled: isEnabled
      });
      
      // 保存完了メッセージを表示
      const message = document.createElement('div');
      message.textContent = '設定を保存しました';
      message.style.color = 'green';
      message.style.marginTop = '10px';
      document.body.appendChild(message);
      setTimeout(() => message.remove(), 2000);
    });
  });
}); 