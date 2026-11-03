// モックアップ用の小さな動き（本番のコードではない）

// ハンバーガーメニューの開け閉め
document.querySelectorAll('[data-burger]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const menu = document.querySelector('.mobile-menu');
    const open = menu.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
    btn.textContent = open ? '✕' : '☰';
  });
});

// data-open="ID" のボタンでダイアログを開き、data-close で閉じる
document.querySelectorAll('[data-open]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.getElementById(btn.dataset.open).classList.add('open');
  });
});
document.querySelectorAll('[data-close]').forEach((btn) => {
  btn.addEventListener('click', () => {
    btn.closest('.overlay').classList.remove('open');
  });
});
document.querySelectorAll('.overlay').forEach((ov) => {
  ov.addEventListener('click', (e) => {
    if (e.target === ov) ov.classList.remove('open');
  });
});

// 通知を出す（data-toast="success|error" と data-title・data-msg）
function showToast(type, title, msg) {
  let area = document.querySelector('.toast-area');
  if (!area) {
    area = document.createElement('div');
    area.className = 'toast-area';
    document.body.appendChild(area);
  }
  const t = document.createElement('div');
  t.className = 'toast' + (type === 'error' ? ' error' : '');
  t.setAttribute('role', type === 'error' ? 'alert' : 'status');
  t.innerHTML = `<span>${type === 'error' ? '⚠️' : '✅'}</span><div><b></b><span></span></div><button class="close" aria-label="閉じる">✕</button>`;
  t.querySelector('b').textContent = title;
  t.querySelector('div span').textContent = msg;
  t.querySelector('.close').addEventListener('click', () => t.remove());
  area.appendChild(t);
  // 成功は4秒で消える。エラーは自分で閉じるまで残す
  if (type !== 'error') setTimeout(() => t.remove(), 4000);
}
document.querySelectorAll('[data-toast]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const ov = btn.closest('.overlay');
    if (ov) ov.classList.remove('open');
    showToast(btn.dataset.toast, btn.dataset.title, btn.dataset.msg || '');
  });
});
