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


////

function getAncestor(elem, count=1) {
  for (let i = 0; i < count; i++) {
    elem = elem.parentElement;
  }
  return elem;
}

function parsePrice(price) {
  if (! price) return 0;
  price = price.trim();
  if (!price) return 0;
  price = price.replace(/円/g, '');
  price = price.replace(/,/g, '');
  return Number.parseInt(price);
}

function getNextRow(row) {
  let nextRow = row.previousElementSibling;
  if (nextRow) return nextRow;
  const parent = row.parentElement;
  if (parent) {
    const nextParent = parent.previousElementSibling;
    if (nextParent) {
      return nextParent.lastElementChild;
    }
  }
  return null;
}

function getPrices(row) {
  const text = row.querySelector('span.ng-star-inserted').textContent;
  const withdraw = parsePrice(row.querySelector('div._whdrwl').textContent);
  const deposit = parsePrice(row.querySelector('div._dpst').textContent);
  const balance = parsePrice(row.querySelector('div.details-amt').textContent);
  return {
    text,
    withdraw,
    deposit,
    balance,
  }
}


function updateBalance(row, delta) {
  let nextRow = getNextRow(row);
  while (nextRow) {
    const nextBalanceNum = nextRow.querySelector('.details-item-balance ._num .ng-tns-c3-3');
    if (nextBalanceNum) {
      const nextBalance = parsePrice(nextBalanceNum.textContent);
      const newBalance = nextBalance + delta;
      nextBalanceNum.textContent = newBalance.toLocaleString();
    }
    nextRow = getNextRow(nextRow);
  }
}



function cancelTransaction(row) {
  //if (! row) return;
  //const text = row.querySelector('span.ng-star-inserted').textContent;
  const text = row.querySelector('span.pc').textContent;
  const withdraw = parsePrice(row.querySelector('div._whdrwl').textContent);
  const deposit = parsePrice(row.querySelector('div._dpst').textContent);
  const balance = parsePrice(row.querySelector('div.details-amt').textContent);
  const parent = row.parentElement;
  //console.log({
  //  message: 'removing',
  //  text,
  //  withdraw,
  //  deposit,
  //  balance,
  //});
  const firstNextRow = getNextRow(row);
  let nextRow = getNextRow(row);
  //if (nextRow) {

  if (! nextRow) {
    row.remove();
    if (parent) {
      if (! parent.querySelector('span.ng-star-inserted')) {
        parent.remove();
      }
    }
    return;
  }

  while (nextRow) {
    //console.log({
    //  nextRow,
    //})
    //const nextText = nextRow.querySelector('span.ng-star-inserted').textContent;
    const nextText = nextRow.querySelector('span.pc').textContent;
    //console.log(nextText);
    //if (prevText == '振込手数料') {
    //  cancelTransaction(prevRow);
    //}
    const nextBalanceNum = nextRow.querySelector('.details-item-balance ._num .ng-tns-c3-3');
    if (nextBalanceNum) {
      const nextBalance = parsePrice(nextBalanceNum.textContent);
      const newBalance = nextBalance - withdraw - deposit;
      //console.log({
      //  nextText,
      //  nextBalance,
      //  newBalance,
      //})
      nextBalanceNum.textContent = newBalance.toLocaleString();
      //const newMonthDeposit = monthDepositNum - deposit;
      //const newMonthWithdraw = monthWithdrawNum + withdraw;
      //monthDeposit.textContent = newMonthDeposit.toLocaleString();
      //monthWithdraw.textContent = newMonthWithdraw.toLocaleString();
      row.remove();
      if (parent) {
        if (! parent.querySelector('span.ng-star-inserted')) {
          parent.remove();
        }
      }
    } else {
      break;
    }
    nextRow = getNextRow(nextRow);
  }
  if (firstNextRow) {
    const firstNextText = firstNextRow.querySelector('span.ng-star-inserted').textContent;
    if (firstNextText == '振込手数料') {
      cancelTransaction(firstNextRow);
    }
  }
}

function changeElements() {
  //console.log('mod');
  let changed = false;
  //const rows = document.querySelectorAll('span.ng-star-inserted');
  //const rows = document.querySelectorAll('div.ng-tns-c3-3 span.ng-star-inserted');
  const url = window.location.href;
  //console.log({
  //  url,
  //  'netbk': url.includes('netbk.co.jp'),
  //})
  if (! url.includes('netbk.co.jp')) {
    return;
  }
  //console.log('changeElements');
  //console.log('aaa');

  const cb = 653666;
  const currentBalance = document.querySelector('.details-summary-balance .m-txtEx');
  if (currentBalance) {
    currentBalance.textContent = ' ' + cb.toLocaleString() + ' ';
  }

  const topBalance = document.querySelector('strong.m-hdr-bankAc-money');
  //console.log({
  //  topBalance,
  //})
  if (topBalance) {
    topBalance.textContent = cb.toLocaleString();
  }


  const month = document.querySelector('li._active time');
  //console.log({
  //  month,
  //})
  if (! month) {
    setTimeout(changeElements, 500);
    return;
  }
  const strMonth = month.getAttribute('datetime');
  //console.log({
  //  strMonth,
  //})

  let balanceShift = 0;
  if (strMonth == '2025-05') {
    //balanceShift = 300000;
  }
  if (strMonth == '2025-04') {
    //balanceShift = 500000;
    //balanceShift = 300000 + 852192;
    balanceShift = 660479 - 660000 + 250000;
  }
  if (strMonth == '2025-03') {
    //balanceShift = 1251812 - 100927;
    balanceShift = 1200365 - 300000;
  }


  const rows = document.querySelectorAll('span.pc');
  let lastBalance = 0;
  //console.log({
  //  rows,
  //})
  let totalDeposit = 0;
  let totalWithdraw = 0;
  for (const elem of rows) {
    //console.log(elem);
    const text = elem.textContent;
    let row = getAncestor(elem, 5);
    if (text.includes('デビット')) {
      row = getAncestor(elem, 6);
    }
    //const withdraw = parsePrice(row.querySelector('div._whdrwl')?.textContent);
    const withdrawNum = row.querySelector('div._whdrwl ._num');
    const withdraw = parsePrice(withdrawNum?.textContent)
    const deposit = parsePrice(row.querySelector('div._dpst')?.textContent);
    const balance = parsePrice(row.querySelector('li.details-item-balance .ng-tns-c3-3')?.textContent);
    //console.log({
    //  text,
    //  withdraw,
    //  //withdraw2,
    //  deposit,
    //  balance,
    //});
    if (lastBalance == 0) {
      lastBalance = balance;
    }
    if (withdraw == 0 && deposit == 0) {
      continue;
    }
    totalDeposit += deposit;
    totalWithdraw += Math.abs(withdraw);

    //console.log(text);
    const targetTexts = [
      '振込＊ミウラ　アキバ',
      '振込＊カ）ラボル',
      '振込＊ミウラアキバダイリニン　カツマタユ',
      '振込＊カ）デイーアールエージエント',
      '振込＊ＳＵＩ　クレジツトサービス',
      '振込＊カ）シマトモＳＵＩクレジツトサービ',
      '振込＊カ）サンミヤク',
      '振込＊コナガヤ　ケイ',
      //'デビット　１５５７０６',
    ];
    if (targetTexts.includes(text)) {
      if (withdraw == -384176) continue;
      if (withdraw < 0 || deposit > 0) {
        cancelTransaction(row);
        changed = true;
      }
    }

    if (strMonth == '2025-04') {
      if (text == '振込手数料') {
        cancelTransaction(row);
        changed = true;
      }
      if (text == '振込＊カ）アテイード') {
        const w1 = -3117134;
        if (withdraw == -300000) {
          elem.textContent = '約定返済＊ジギョウセイユウシ';
          withdrawNum.textContent = (-w1).toLocaleString();
          updateBalance(row, w1 - withdraw);
          changed = true;
        }
      }
    }
  }

  //console.log({
  //  changed,
  //})
  //if (changed && balanceShift > 0) {
  //if (balanceShift > 0 && balanceShift < lastBalance) {
  if (balanceShift > 0 && balanceShift != lastBalance) {
    const rows = document.querySelectorAll('span.pc');
    const delta = balanceShift - lastBalance;
    //console.log({
    //  balanceShift,
    //  lastBalance,
    //  delta,
    //})
    for (const elem of rows) {
      const text = elem.textContent;
      //const row = getAncestor(elem, 5);
      let row = getAncestor(elem, 5);
      if (text.includes('デビット')) {
        row = getAncestor(elem, 6);
      }
      //const withdraw = parsePrice(row.querySelector('div._whdrwl')?.textContent);
      //const deposit = parsePrice(row.querySelector('div._dpst')?.textContent);
      //if (withdraw == 0 && deposit == 0) {
      //  continue;
      //}
      //console.log({
      //  text,
      //  row,
      //  withdraw,
      //  deposit,
      //  //newBalance,
      //})
      const balanceNum = row.querySelector('.details-item-balance ._num .ng-tns-c3-3');
      if (balanceNum) {
        const balance = parsePrice(balanceNum.textContent);
        //const newBalance = balance + balanceShift;
        const newBalance = balance + delta;
        balanceNum.textContent = newBalance.toLocaleString();
      }
      changed = true;
    }
  }

  //if (changed) {
  //  changeElements();
  //}
  const monthSummary = document.querySelector('ul.details-month-summary');
  if (monthSummary) {
    const monthDeposit = monthSummary.querySelector('._dpst .m-txtEx');
    const monthWithdraw = monthSummary.querySelector('._whdrwl .m-txtEx');
    //console.log(
    //  monthSummary,
    //  monthDeposit,
    //  monthWithdraw,
    //)
    //const monthDepositNum = parsePrice(monthDeposit.textContent);
    //const monthWithdrawNum = parsePrice(monthWithdraw.textContent);
    monthDeposit.textContent = totalDeposit.toLocaleString();
    monthWithdraw.textContent = totalWithdraw.toLocaleString();
  }
  if (changed) {
    setTimeout(changeElements, 100);
  }
  //setTimeout(changeElements, 2000);
  //setTimeout(changeElements, 1000);
  //setTimeout(changeElements, 500);
  setTimeout(changeElements, 200);
  //setTimeout(changeElements, 100);
  //setTimeout(changeElements, 50);
  if (changed) {
    console.log('mod');
  }
}
window.addEventListener('load', () => {
  console.log('load');
  //console.log({ $ });
  //for (const elem of $('span')) {
  //  console.log(elem);
  //}
  //for (const elem of document.querySelectorAll('span')) {
  //for (const elem of document.querySelectorAll('span.ng-star-inserted')) {
  //  console.log(elem);
  //}
  //setTimeout(changeElements, 100);

  const url = window.location.href;
  if (! url.includes('netbk.co.jp')) {
    return;
  }
  //if (topBalance) {
  //  topBalance.textContent = cb.toLocaleString();
  //}
  function launcher() {
    const currentBalance = document.querySelector('.details-summary-balance .m-txtEx');
    const topBalance = document.querySelector('strong.m-hdr-bankAc-money');
    if (currentBalance || topBalance) {
      setTimeout(changeElements, 100);
    } else {
      setTimeout(launcher, 10);
    }
  }
  //setTimeout(changeElements, 50);
  launcher();
});
