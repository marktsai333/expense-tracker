
  function Spring(stiffness, damping, mass) {
    this.k = stiffness; this.d = damping; this.m = mass;
    this.value = 0; this.velocity = 0; this.target = 0;
  }
  Spring.prototype.set = function (v) { this.value = v; this.target = v; this.velocity = 0; };
  Spring.prototype.setTarget = function (v) { this.target = v; };
  Spring.prototype.step = function (dt) {
    const force = -this.k * (this.value - this.target);
    const damping = -this.d * this.velocity;
    this.velocity += (force + damping) / this.m * dt;
    this.value += this.velocity * dt;
  };

  const ICON_CASH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/><path d="M5.5 9v.01M18.5 15v.01" stroke-width="2.4"/></svg>`;
  const ICON_CREDIT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5.5" width="19" height="13" rx="2.5"/><path d="M2.5 10h19" stroke-width="2.2"/><rect x="5" y="13.2" width="4.2" height="2.8" rx="0.6" fill="currentColor" stroke="none"/></svg>`;
  const ICON_BANK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5 12 4l9 5.5"/><path d="M4.5 9.5v8.5M9 9.5v8.5M15 9.5v8.5M19.5 9.5v8.5"/><path d="M2.5 20.5h19"/></svg>`;
  const ICON_BANK_CHASE = `<svg viewBox="0 0 24 24"><path d="M21.7 16.02 16.02 21.7H7.98L2.3 16.02V7.98L7.98 2.3h8.04L21.7 7.98Z" fill="#117ACA"/><path d="M12 6 18 12 12 18 6 12Z" fill="#fff"/></svg>`;

  const TYPE_LABELS = { cash: '現金', bank: '銀行帳戶', credit: '信用卡' };
  const TYPE_ICONS = { cash: ICON_CASH, bank: ICON_BANK, credit: ICON_CREDIT };
  const METHOD_LABELS = { debit: '金融卡', zelle: 'Zelle' };

  const banks = [
    { id: 'chase', name: 'Chase', icon: ICON_BANK_CHASE },
  ];

  const accounts = [];

  const creditTransactions = [];

  const TODAY = new Date();
  function isoDate(d) { return d.toISOString().slice(0, 10); }
  function lastClosingDate(closingDay, ref) {
    const d = new Date(ref.getFullYear(), ref.getMonth(), closingDay);
    if (d.getTime() > ref.getTime()) d.setMonth(d.getMonth() - 1);
    return d;
  }
  function statementSplit(credit) {
    const closingDay = credit.closingDay || 1;
    const closingISO = isoDate(lastClosingDate(closingDay, TODAY));
    let billed = 0, unbilled = 0;
    for (const tx of creditTransactions) {
      if (tx.accountId !== credit.id) continue;
      if (tx.iso <= closingISO) billed += tx.amount; else unbilled += tx.amount;
    }
    billed = +billed.toFixed(2);
    unbilled = +unbilled.toFixed(2);
    return { billed: credit.paidUpToClosing === closingISO ? 0 : billed, unbilled, closingISO, closingDay };
  }

  function fmt(n) {
    const sign = n < 0 ? '-' : '';
    return sign + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function cashBalance(a) { return a.startingBalance - a.spent; }
  function creditBalance(a) { return -a.spent; }
  function creditAvailable(a) { return a.limit - a.spent; }

  function accountRowHTML(a, opts) {
    opts = opts || {};
    const icon = TYPE_ICONS[a.paymentType];
    const isCredit = a.paymentType === 'credit';
    const amt = isCredit ? fmt(creditBalance(a)) : fmt(cashBalance(a));
    const amtClass = isCredit ? 'credit' : 'cash';
    const handle = opts.reorder ? `<span class="drag-handle">☰</span>` : '';
    let secondary = '';
    if (isCredit) {
      secondary = `<div class="row-sub">可用額度 ${fmt(creditAvailable(a))}</div>`;
    } else if (a.paymentType === 'bank' && a.methods && a.methods.length) {
      secondary = `<div class="row-tags">${a.methods.map((m) => METHOD_LABELS[m]).join('・')}</div>`;
    }
    return `
      ${handle}
      <div class="row-icon">${icon}</div>
      <div class="row-body"><div class="row-name">${esc(a.name)}</div>${secondary}</div>
      <div class="row-amt ${amtClass}">${amt}</div>
    `;
  }

  function accountGroups() {
    const groups = banks
      .map((bank) => ({
        key: bank.id, label: bank.name, icon: bank.icon, isBank: true,
        accounts: accounts.filter((a) => a.bankId === bank.id),
      }))
      .filter((g) => g.accounts.length);
    const cashAccounts = accounts.filter((a) => a.bankId == null);
    if (cashAccounts.length) {
      groups.push({ key: 'cash-group', label: '現金', icon: ICON_CASH, isBank: false, accounts: cashAccounts });
    }
    return groups;
  }

  function bankGroupHTML(group, rowsHTML) {
    const logo = group.isBank
      ? `<div class="bank-logo">${group.icon}</div>`
      : `<div class="bank-logo" style="background:var(--chip-bg);color:var(--muted);box-shadow:none;">${group.icon}</div>`;
    return `
      <div class="bank-group" data-group="${group.key}">
        <div class="bank-header">${logo}<div class="bank-name">${esc(group.label)}</div></div>
        <div class="account-list" style="padding:0;">${rowsHTML}</div>
      </div>
    `;
  }

  function renderAccountList() {
    const el = document.getElementById('accountList');
    const allGroups = accountGroups();
    const sectionLabel = allGroups.some((g) => !g.isBank) ? '帳戶' : '銀行';
    const groups = allGroups.map((g) => {
      const rows = g.accounts.map((a) => `<div class="account-row" data-id="${a.id}">${accountRowHTML(a)}</div>`).join('');
      return bankGroupHTML(g, rows);
    }).join('');
    el.innerHTML = `<div class="list-section-label"><span>${sectionLabel}</span><div class="label-line"></div></div>${groups}`;
    el.querySelectorAll('.account-row').forEach((row) => {
      row.addEventListener('click', () => {
        const acc = accounts.find((a) => a.id === row.dataset.id);
        if (acc.paymentType === 'credit') { renderDetail(acc.id); showScreen('detail'); }
        else { openEditSheet(acc); }
      });
    });
  }

  function renderSettingsList() {
    const el = document.getElementById('settingsList');
    el.innerHTML = accountGroups().map((g) => {
      const rows = g.accounts.map((a) => `
        <div class="swipe-wrap" data-id="${a.id}">
          <button class="swipe-action" data-id="${a.id}">刪除</button>
          <div class="account-row reorder-row swipe-content" data-id="${a.id}" style="cursor:default;">${accountRowHTML(a, { reorder: true })}</div>
        </div>
      `).join('');
      return bankGroupHTML(g, rows);
    }).join('');
    el.querySelectorAll('.bank-group').forEach((group) => { wireReorder(group); wireSwipeDelete(group); });
  }

  function primaryCreditAccount() {
    const creditAccounts = accounts.filter((a) => a.paymentType === 'credit');
    return creditAccounts.find((a) => a.primaryOverview) || creditAccounts[0] || null;
  }
  function totalCashBalance() { return accounts.filter((a) => a.paymentType !== 'credit').reduce((s, a) => s + cashBalance(a), 0); }
  function renderOverview() {
    const credit = primaryCreditAccount();
    const heroTitleEl = document.getElementById('ovHeroTitle');
    const heroAmtEl = document.getElementById('ovHeroAmt');
    const heroSubEl = document.getElementById('ovHeroSub');
    const heroProgressWrap = document.getElementById('ovProgressWrap');
    const heroFillEl = document.getElementById('ovProgressFill');
    if (credit) {
      heroTitleEl.textContent = credit.name + '・本期已刷';
      heroAmtEl.textContent = fmt(credit.spent);
      heroSubEl.innerHTML = `<span>額度 ${fmt(credit.limit)}</span><span>剩餘 ${fmt(creditAvailable(credit))}</span>`;
      heroFillEl.style.width = Math.min(100, (credit.limit > 0 ? credit.spent / credit.limit : 0) * 100) + '%';
      heroProgressWrap.style.display = '';
    } else {
      heroTitleEl.textContent = '現金總額';
      heroAmtEl.textContent = fmt(totalCashBalance());
      heroSubEl.innerHTML = '';
      heroProgressWrap.style.display = 'none';
    }

    const assetAccounts = accounts.filter((a) => a.paymentType !== 'credit');
    const liabilityAccounts = accounts.filter((a) => a.paymentType === 'credit');
    const assetTotal = assetAccounts.reduce((s, a) => s + cashBalance(a), 0);
    const liabilityTotal = liabilityAccounts.reduce((s, a) => s + creditBalance(a), 0);

    document.getElementById('ovAssetTotal').textContent = fmt(assetTotal);
    document.getElementById('ovAssetRows').innerHTML = assetAccounts.length
      ? assetAccounts.map((a) => `<div class="plain-row"><span class="name">${esc(a.name)}</span><span class="plain-amt">${fmt(cashBalance(a))}</span></div>`).join('')
      : `<div class="plain-row"><span class="name">尚無帳戶</span><span class="plain-amt">$0.00</span></div>`;

    document.getElementById('ovLiabilityTotal').textContent = fmt(liabilityTotal);
    document.getElementById('ovLiabilityRows').innerHTML = liabilityAccounts.length
      ? liabilityAccounts.map((a) => `<div class="plain-row"><span class="name">${esc(a.name)}</span><span class="plain-amt">${fmt(creditBalance(a))}</span></div>`).join('')
      : `<div class="plain-row"><span class="name">尚無信用卡</span><span class="plain-amt">$0.00</span></div>`;

    // 變體 A：淨資產 = 資產總額 - 負債總額(絕對值)。跟資產/負債分段切換無關，
    // 兩者互相獨立(比照 overview-toggle-demo.html 已核准的行為)。
    const netWorth = assetTotal + liabilityTotal;
    const netWorthEl = document.getElementById('ovNetWorth');
    netWorthEl.textContent = fmt(netWorth);
    netWorthEl.style.color = netWorth < 0 ? 'var(--danger)' : 'var(--success)';
  }

  const ovSegmented = document.getElementById('ovSegmented');
  const ovSegPill = document.getElementById('ovSegPill');
  const ovSegOpts = ovSegmented.querySelectorAll('.seg-opt');
  const ovPillX = new Spring(220, 20, 1);
  const ovPillW = new Spring(220, 20, 1);
  function ovOptRect(opt) {
    const segRect = ovSegmented.getBoundingClientRect();
    const r = opt.getBoundingClientRect();
    return { x: r.left - segRect.left - ovSegmented.clientLeft, w: r.width };
  }
  function syncOverviewSegmented() {
    const active = ovSegmented.querySelector(':scope > .seg-opt.active');
    if (!active || !ovSegmented.offsetWidth) return;
    const { x, w } = ovOptRect(active);
    ovPillX.set(x);
    ovPillW.set(w);
    ovSegPill.style.left = x + 'px';
    ovSegPill.style.width = w + 'px';
  }
  syncOverviewSegmented();
  // The phone entry point adds its viewport/safe-area stylesheet after this
  // script loads. That can change the segmented control's width after the
  // first measurement. Observe the actual box so the indicator never needs a
  // manual tap to be corrected on the first standalone visit.
  const ovSegmentedResizeObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver(syncOverviewSegmented)
    : null;
  ovSegmentedResizeObserver?.observe(ovSegmented);
  window.addEventListener('resize', syncOverviewSegmented, { passive: true });
  window.visualViewport?.addEventListener('resize', syncOverviewSegmented, { passive: true });
  window.addEventListener('pageshow', syncOverviewSegmented, { passive: true });
  requestAnimationFrame(() => requestAnimationFrame(syncOverviewSegmented));
  let ovCurrentIndex = 0;
  const ovPanelAssets = document.getElementById('ovPanelAssets');
  const ovPanelLiabilities = document.getElementById('ovPanelLiabilities');
  const ovListViewport = document.getElementById('ovListViewport');
  function ovSelectIndex(idx) {
    if (idx === ovCurrentIndex) return;
    const dir = idx > ovCurrentIndex ? 1 : -1;
    ovCurrentIndex = idx;
    ovSegOpts.forEach((o) => o.classList.toggle('active', Number(o.dataset.i) === idx));
    const outgoing = idx === 1 ? ovPanelAssets : ovPanelLiabilities;
    const incoming = idx === 1 ? ovPanelLiabilities : ovPanelAssets;
    const outgoingHeight = outgoing.offsetHeight;
    incoming.style.visibility = 'hidden';
    incoming.style.position = 'static';
    const incomingHeight = incoming.offsetHeight;
    incoming.style.visibility = '';
    ovListViewport.style.transition = 'none';
    ovListViewport.style.height = outgoingHeight + 'px';
    ovListViewport.getBoundingClientRect();
    ovListViewport.style.transition = '';
    outgoing.style.position = 'absolute';
    outgoing.classList.remove('static-flow');
    incoming.style.position = 'absolute';
    incoming.classList.remove('static-flow');
    incoming.style.transition = 'none';
    incoming.style.transform = `translateX(${dir * 100}%)`;
    incoming.style.opacity = '0';
    incoming.getBoundingClientRect();
    incoming.style.transition = '';
    requestAnimationFrame(() => {
      outgoing.style.transform = `translateX(${-dir * 100}%)`;
      outgoing.style.opacity = '0';
      incoming.style.transform = 'translateX(0)';
      incoming.style.opacity = '1';
      ovListViewport.style.height = incomingHeight + 'px';
    });
    setTimeout(() => {
      incoming.classList.add('static-flow');
      incoming.style.position = '';
      ovListViewport.style.height = '';
    }, 340);
  }
  function ovOptAtPoint(clientX) {
    for (const o of ovSegOpts) {
      const r = o.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right) return o;
    }
    const firstRect = ovSegOpts[0].getBoundingClientRect();
    const lastRect = ovSegOpts[ovSegOpts.length - 1].getBoundingClientRect();
    if (clientX < firstRect.left) return ovSegOpts[0];
    if (clientX > lastRect.right) return ovSegOpts[ovSegOpts.length - 1];
    return null;
  }
  function ovActivate(opt) {
    const idx = Number(opt.dataset.i);
    const { x, w } = ovOptRect(opt);
    ovPillX.setTarget(x);
    ovPillW.setTarget(w);
    ovSelectIndex(idx);
  }
  let ovDragging = false;
  ovSegmented.addEventListener('pointerdown', (e) => {
    ovDragging = true;
    ovSegmented.setPointerCapture(e.pointerId);
    const hit = ovOptAtPoint(e.clientX);
    if (hit) ovActivate(hit);
  });
  ovSegmented.addEventListener('pointermove', (e) => {
    if (!ovDragging) return;
    const hit = ovOptAtPoint(e.clientX);
    if (hit) ovActivate(hit);
  });
  function ovEndDrag(e) {
    if (!ovDragging) return;
    ovDragging = false;
    if (ovSegmented.hasPointerCapture(e.pointerId)) ovSegmented.releasePointerCapture(e.pointerId);
  }
  ovSegmented.addEventListener('pointerup', ovEndDrag);
  ovSegmented.addEventListener('pointercancel', ovEndDrag);
  document.getElementById('ovSyncBtn').addEventListener('click', () => showToast('已同步'));

  function tickOvPill() {
    ovPillX.step(0.016); ovPillW.step(0.016);
    ovSegPill.style.left = ovPillX.value + 'px';
    ovSegPill.style.width = ovPillW.value + 'px';
    requestAnimationFrame(tickOvPill);
  }
  requestAnimationFrame(tickOvPill);

  const pageIds = { overview: 'pageOverview', accounts: 'pageAccounts', analysis: 'pageAnalysis', list: 'pageList', me: 'pageMe' };
  const pageOrder = ['overview', 'accounts', 'analysis', 'list', 'me'];
  function showPage(name) {
    ['editSheet','paySheet','pickerSheet','mySheet'].forEach(id => { const sheet = document.getElementById(id); sheet?.classList.remove('open'); sheet?.classList.add('is-suppressed'); });
    document.getElementById('sheetBackdrop')?.classList.remove('open');
    Object.values(pageIds).forEach((id) => document.getElementById(id).classList.remove('visible'));
    document.getElementById(pageIds[name]).classList.add('visible');
    document.querySelector('.phone').scrollTop = 0;
    if (name === 'overview') renderOverview();
    if (name === 'analysis') refreshActiveAnalysisTab();
    if (name === 'list') window.renderDetailsPage?.();
    if (name === 'me') renderMy();
  }

  const screens = { list: 'screenList', settings: 'screenSettings', add: 'screenAdd', detail: 'screenDetail' };
  function showScreen(name) {
    Object.values(screens).forEach((id) => document.getElementById(id).classList.remove('visible'));
    document.getElementById(screens[name]).classList.add('visible');
  }
  document.getElementById('gearBtn').addEventListener('click', () => { renderSettingsList(); showScreen('settings'); });
  document.getElementById('addBtnTop').addEventListener('click', () => showScreen('add'));
  document.getElementById('syncBtn').addEventListener('click', () => showToast('已同步'));

  let currentDetailId = null;
  function renderDetail(id) {
    if (id !== undefined) currentDetailId = id;
    const credit = accounts.find((a) => a.id === currentDetailId) || accounts.find((a) => a.paymentType === 'credit');
    if (!credit) return;
    currentDetailId = credit.id;
    document.getElementById('usageAmt').textContent = fmt(credit.spent);
    document.getElementById('limitAmt').textContent = '額度 ' + fmt(credit.limit);
    document.getElementById('availableAmt').textContent = '可用 ' + fmt(creditAvailable(credit));
    document.getElementById('progressFill').style.width = Math.min(100, (credit.limit > 0 ? credit.spent / credit.limit : 0) * 100) + '%';

    const stmt = statementSplit(credit);
    document.getElementById('unbilledAmt').textContent = '-' + fmt(stmt.unbilled);
    document.getElementById('closingDaySub').textContent = stmt.closingDay + '日結帳';
    document.getElementById('billedAmt').textContent = fmt(stmt.billed);
    const payBtn = document.getElementById('payBtn');
    payBtn.disabled = stmt.billed <= 0;

    const el = document.getElementById('creditTxList');
    let html = '';
    let lastMonth = null;
    for (const tx of creditTransactions) {
      if (tx.accountId !== credit.id) continue;
      if (tx.month !== lastMonth) { html += `<div class="section-header" style="padding-top:14px;">${tx.month}</div>`; lastMonth = tx.month; }
      html += `<div class="tx-row"><div><div class="tx-cat">${esc(tx.category)}</div><div class="tx-name">${esc(tx.name)}</div></div><div class="tx-amt">${fmt(tx.amount)}</div></div>`;
    }
    for (const p of paymentLog) {
      if (p.creditId !== credit.id) continue;
      html += `<div class="tx-row"><div><div class="tx-cat">繳費</div><div class="tx-name">信用卡繳費</div></div><div class="tx-amt payment">${fmt(-p.amount)}</div></div>`;
    }
    if (!html) html = `<div class="empty-hint" style="padding:24px 4px;color:var(--muted);text-align:center;">尚無交易紀錄</div>`;
    el.innerHTML = html;
  }

  const paymentLog = [];
  const adjustmentLog = [];
  function fmtSigned(n) {
    return (n >= 0 ? '+' : '-') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  const sheetBackdrop = document.getElementById('sheetBackdrop');

  const pickerSheet = document.getElementById('pickerSheet');
  const pickerList = document.getElementById('pickerList');
  let pickerOnSelect = null;
  function setFieldSelectValue(el, label, value) {
    el.dataset.value = value || '';
    el.querySelector('.field-select-value').textContent = label || '';
  }
  function openPicker(title, options, currentValue, onSelect) {
    pickerSheet.classList.remove('is-suppressed');
    document.getElementById('pickerTitle').textContent = title;
    pickerList.innerHTML = options.map((o) => `
      <div class="picker-row${o.value === currentValue ? ' selected' : ''}" data-value="${o.value}">
        ${o.icon ? `<div class="row-icon">${o.icon}</div>` : ''}
        <div class="picker-row-name">${esc(o.label)}</div>
        <svg class="picker-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l5 5 11-11"/></svg>
      </div>
    `).join('');
    pickerOnSelect = onSelect;
    sheetBackdrop.classList.add('open');
    pickerSheet.classList.add('open');
  }
  function closePicker() {
    pickerSheet.classList.remove('open');
    pickerOnSelect = null;
  }
  pickerList.addEventListener('click', (e) => {
    const row = e.target.closest('.picker-row');
    if (!row) return;
    const value = row.dataset.value;
    const cb = pickerOnSelect;
    closePicker();
    if (cb) cb(value);
  });
  function wireFieldSelect(el, title, getOptions, onChange) {
    el.addEventListener('click', () => {
      const options = getOptions();
      openPicker(title, options, el.dataset.value, (value) => {
        const chosen = options.find((o) => o.value === value);
        setFieldSelectValue(el, chosen ? chosen.label : '', value);
        onChange(value);
      });
    });
  }

  const paySheet = document.getElementById('paySheet');
  const payAmountInput = document.getElementById('payAmountInput');
  let selectedPayAccountId = 'checking';

  function openPaySheet() {
    paySheet.classList.remove('is-suppressed');
    const credit = accounts.find((a) => a.id === currentDetailId);
    if (!credit) return;
    const stmt = statementSplit(credit);
    if (stmt.billed <= 0) { showToast('目前沒有應繳帳單'); return; }
    payAmountInput.value = stmt.billed.toFixed(2);
    payAmountInput.readOnly = true;
    selectedPayAccountId = credit.linkedAccountId;
    renderAccountPicker();
    sheetBackdrop.classList.add('open');
    paySheet.classList.add('open');
  }
  function closePaySheet() {
    sheetBackdrop.classList.remove('open');
    paySheet.classList.remove('open');
  }
  function renderAccountPicker() {
    const el = document.getElementById('accountPicker');
    const payAccounts = accounts.filter((a) => a.paymentType !== 'credit');
    el.innerHTML = payAccounts.map((a) => `
      <div class="account-choice ${a.id === selectedPayAccountId ? 'selected' : ''}" data-id="${a.id}">
        <div class="row-icon">${TYPE_ICONS[a.paymentType]}</div>
        <div class="row-body"><div class="row-name">${esc(a.name)}</div><div class="row-sub">目前餘額 ${fmt(cashBalance(a))}</div></div>
      </div>
    `).join('');
    el.querySelectorAll('.account-choice').forEach((choice) => {
      choice.addEventListener('click', () => {
        selectedPayAccountId = choice.dataset.id;
        renderAccountPicker();
      });
    });
  }

  document.getElementById('payBtn').addEventListener('click', openPaySheet);
  sheetBackdrop.addEventListener('click', () => {
    if (pickerSheet.classList.contains('open')) { closePicker(); return; }
    closePaySheet(); closeEditSheet(); closeMySheet();
  });

  document.getElementById('confirmPayBtn').addEventListener('click', () => {
    const credit = accounts.find((a) => a.id === currentDetailId);
    if (!credit) return;
    const stmt = statementSplit(credit);
    const amount = stmt.billed;
    if (amount <= 0) return;
    credit.spent -= amount;
    credit.paidUpToClosing = stmt.closingISO;
    const chosenAccount = accounts.find((a) => a.id === selectedPayAccountId);
    chosenAccount.spent += amount;
    paymentLog.push({ amount, accountId: selectedPayAccountId, creditId: credit.id });
    closePaySheet();
    renderDetail();
    renderAccountList();
    renderOverview();
    showToast(`已從${chosenAccount.name}扣款 ${fmt(amount)}`);
  });

  const editSheet = document.getElementById('editSheet');
  let editingAccountId = null;
  let editingMethods = [];

  function editLinkedAccountOptions() {
    return accounts.filter((a) => a.paymentType !== 'credit')
      .map((a) => ({ value: a.id, label: a.name, icon: TYPE_ICONS[a.paymentType] }));
  }
  function populateEditLinkedAccountSelect(acc) {
    const options = editLinkedAccountOptions();
    const chosen = options.find((o) => o.value === acc.linkedAccountId);
    setFieldSelectValue(document.getElementById('editLinkedAccountSelect'), chosen ? chosen.label : '請先新增銀行/現金帳戶', acc.linkedAccountId || '');
  }
  wireFieldSelect(document.getElementById('editLinkedAccountSelect'), '掛在哪個帳戶底下', editLinkedAccountOptions, () => {});
  document.getElementById('editPrimaryToggle').addEventListener('click', () => {
    const acc = accounts.find((a) => a.id === editingAccountId);
    if (!acc) return;
    const creditAccounts = accounts.filter((a) => a.paymentType === 'credit');
    const isCurrentlyPrimary = primaryCreditAccount() && primaryCreditAccount().id === acc.id;
    if (isCurrentlyPrimary && creditAccounts.length <= 1) {
      showToast('至少要有一張信用卡顯示於總覽');
      return;
    }
    creditAccounts.forEach((a) => { a.primaryOverview = false; });
    acc.primaryOverview = !isCurrentlyPrimary;
    const toggle = document.getElementById('editPrimaryToggle');
    toggle.classList.toggle('on', acc.primaryOverview);
    toggle.setAttribute('aria-checked', String(acc.primaryOverview));
    renderOverview();
  });
  function renderEditMethodChips(acc) {
    editingMethods = (acc.methods || []).slice();
    const el = document.getElementById('editMethodChips');
    el.innerHTML = Object.keys(METHOD_LABELS).map((m) => `
      <div class="method-chip ${editingMethods.includes(m) ? 'active' : ''}" data-m="${m}">${METHOD_LABELS[m]}</div>
    `).join('');
    el.querySelectorAll('.method-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const m = chip.dataset.m;
        const i = editingMethods.indexOf(m);
        if (i === -1) editingMethods.push(m); else editingMethods.splice(i, 1);
        chip.classList.toggle('active');
      });
    });
  }

  function openEditSheet(acc) {
    editSheet.classList.remove('is-suppressed');
    editingAccountId = acc.id;
    document.getElementById('editAccName').value = acc.name;
    document.getElementById('editAccType').textContent = TYPE_LABELS[acc.paymentType];
    const balanceRow = document.getElementById('editBalanceRow');
    const methodsRow = document.getElementById('editMethodsRow');
    const creditFields = document.getElementById('editCreditFields');
    if (acc.paymentType === 'credit') {
      balanceRow.style.display = 'none';
      methodsRow.style.display = 'none';
      creditFields.style.display = '';
      document.getElementById('editCreditLimit').value = acc.limit;
      document.getElementById('editClosingDay').value = acc.closingDay;
      populateEditLinkedAccountSelect(acc);
      const primaryToggle = document.getElementById('editPrimaryToggle');
      const isPrimary = primaryCreditAccount() && primaryCreditAccount().id === acc.id;
      primaryToggle.classList.toggle('on', isPrimary);
      primaryToggle.setAttribute('aria-checked', String(isPrimary));
    } else {
      balanceRow.style.display = '';
      creditFields.style.display = 'none';
      document.getElementById('editAccBalance').value = cashBalance(acc).toFixed(2);
      if (acc.paymentType === 'bank') {
        methodsRow.style.display = '';
        renderEditMethodChips(acc);
      } else {
        methodsRow.style.display = 'none';
      }
    }
    sheetBackdrop.classList.add('open');
    editSheet.classList.add('open');
  }
  function closeEditSheet() {
    sheetBackdrop.classList.remove('open');
    editSheet.classList.remove('open');
    editingAccountId = null;
  }
  document.getElementById('saveEditAccountBtn').addEventListener('click', () => {
    const acc = accounts.find((a) => a.id === editingAccountId);
    if (!acc) return;
    const name = document.getElementById('editAccName').value.trim();
    if (name) acc.name = name;
    let delta = 0;
    if (acc.paymentType === 'credit') {
      const limit = parseFloat(document.getElementById('editCreditLimit').value);
      if (!isNaN(limit)) acc.limit = limit;
      const closingDay = parseInt(document.getElementById('editClosingDay').value, 10);
      if (!isNaN(closingDay) && closingDay >= 1 && closingDay <= 28) acc.closingDay = closingDay;
      const linkedId = document.getElementById('editLinkedAccountSelect').dataset.value || null;
      acc.linkedAccountId = linkedId;
      const linkedAccount = accounts.find((a) => a.id === linkedId);
      acc.bankId = linkedAccount ? linkedAccount.bankId : null;
    } else {
      const newCurrent = parseFloat(document.getElementById('editAccBalance').value);
      if (!isNaN(newCurrent)) {
        delta = +(newCurrent - cashBalance(acc)).toFixed(2);
        if (Math.abs(delta) > 0.001) {
          acc.spent = +(acc.spent - delta).toFixed(2);
          adjustmentLog.push({ accountId: acc.id, delta, ts: Date.now() });
        }
      }
      if (acc.paymentType === 'bank') acc.methods = editingMethods.slice();
    }
    closeEditSheet();
    renderAccountList();
    renderSettingsList();
    renderOverview();
    if (document.getElementById('screenDetail').classList.contains('visible')) renderDetail();
    showToast(Math.abs(delta) > 0.001
      ? `已更新「${acc.name}」・記錄一筆 ${fmtSigned(delta)} 的餘額調整`
      : `已更新「${acc.name}」`);
  });
  document.getElementById('deleteAccountBtn').addEventListener('click', () => {
    if (!editingAccountId) return;
    const id = editingAccountId;
    deleteAccount(id, () => { closeEditSheet(); showScreen('list'); });
  });
  document.getElementById('editCreditBtn').addEventListener('click', () => openEditSheet(accounts.find((a) => a.id === currentDetailId)));

  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 1800);
  }

  const typeToggle = document.getElementById('typeToggle');
  const typePill = document.getElementById('typePill');
  const typeOpts = typeToggle.querySelectorAll('.type-opt');
  const typeSpringX = new Spring(220, 20, 1);
  const typeSpringW = new Spring(220, 20, 1);
  function typeOptRect(opt) {
    const r = opt.getBoundingClientRect();
    const trackRect = typeToggle.getBoundingClientRect();
    return { x: r.left - trackRect.left - typeToggle.clientLeft, w: r.width };
  }
  {
    const active = typeToggle.querySelector('.type-opt.active');
    const { x, w } = typeOptRect(active);
    typeSpringX.set(x); typeSpringW.set(w);
  }
  function tickType() {
    typeSpringX.step(0.016); typeSpringW.step(0.016);
    typePill.style.left = typeSpringX.value + 'px';
    typePill.style.width = typeSpringW.value + 'px';
    requestAnimationFrame(tickType);
  }
  requestAnimationFrame(tickType);
  typeOpts.forEach((opt) => {
    opt.addEventListener('click', () => {
      typeOpts.forEach((o) => o.classList.remove('active'));
      opt.classList.add('active');
      const { x, w } = typeOptRect(opt);
      typeSpringX.setTarget(x); typeSpringW.setTarget(w);
      updateFormFields();
    });
  });

  function wireReorder(container) {
    const rows = [...container.querySelectorAll('.reorder-row')];
    if (!rows.length) return;
    const rowHeight = rows[0].offsetHeight + 2;
    let dragRow = null, dragStartY = 0, dragOrigIndex = 0, currentIndex = 0;

    rows.forEach((row, origIndex) => {
      const handle = row.querySelector('.drag-handle');
      handle.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        closeAllSwipes(container);
        dragRow = row;
        handle.setPointerCapture(e.pointerId);
        dragStartY = e.clientY;
        dragOrigIndex = origIndex;
        currentIndex = origIndex;
        row.classList.add('dragging');
        row.style.zIndex = 5;
      });
      handle.addEventListener('pointermove', (e) => {
        if (dragRow !== row) return;
        const dy = e.clientY - dragStartY;
        row.style.transform = `translateY(${dy}px)`;
        const newIndex = Math.max(0, Math.min(rows.length - 1, dragOrigIndex + Math.round(dy / rowHeight)));
        if (newIndex !== currentIndex) {
          currentIndex = newIndex;
          rows.forEach((r, i) => {
            if (r === row) return;
            let shift = 0;
            if (dragOrigIndex < currentIndex && i > dragOrigIndex && i <= currentIndex) shift = -1;
            else if (dragOrigIndex > currentIndex && i >= currentIndex && i < dragOrigIndex) shift = 1;
            r.style.transform = shift ? `translateY(${shift * rowHeight}px)` : '';
          });
        }
      });
      handle.addEventListener('pointerup', (e) => {
        if (dragRow !== row) return;
        if (handle.hasPointerCapture(e.pointerId)) handle.releasePointerCapture(e.pointerId);
        row.classList.remove('dragging');
        row.style.zIndex = '';
        row.style.transform = '';
        dragRow = null;
        if (currentIndex !== dragOrigIndex) {
          const fromIdx = accounts.findIndex((a) => a.id === row.dataset.id);
          const [moved] = accounts.splice(fromIdx, 1);
          accounts.splice(currentIndex, 0, moved);
        }
        rows.forEach((r) => { r.style.transform = ''; });
        renderSettingsList();
        renderAccountList();
      });
    });
  }

  const SWIPE_REVEAL = 76;
  const SWIPE_OVERDRAG = 32;
  function rubberband(overshoot, dimension, constant = 0.55) {
    return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
  }
  function closeAllSwipes(container, except) {
    container.querySelectorAll('.swipe-wrap').forEach((w) => {
      if (w === except) return;
      if (w._closeSwipe) w._closeSwipe();
    });
  }
  function wireSwipeDelete(container) {
    container.querySelectorAll('.swipe-wrap').forEach((wrap) => {
      const content = wrap.querySelector('.swipe-content');
      const actionBtn = wrap.querySelector('.swipe-action');
      const spring = new Spring(340, 32, 1);
      let startX = 0, startY = 0, dragging = false, decided = false, horizontal = false;
      let lastX = 0, lastT = 0, velocity = 0, rafId = null;

      function render() { content.style.transform = `translateX(${spring.value}px)`; }
      function tick() {
        spring.step(1 / 60);
        render();
        if (Math.abs(spring.value - spring.target) < 0.3 && Math.abs(spring.velocity) < 20) {
          spring.value = spring.target;
          render();
          rafId = null;
          return;
        }
        rafId = requestAnimationFrame(tick);
      }
      function settleTo(target) {
        spring.setTarget(target);
        wrap.classList.toggle('swiped', target < -SWIPE_REVEAL / 2);
        if (!rafId) rafId = requestAnimationFrame(tick);
      }
      wrap._closeSwipe = () => settleTo(0);

      content.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.drag-handle')) return;
        closeAllSwipes(container, wrap);
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        startX = e.clientX; startY = e.clientY;
        lastX = e.clientX; lastT = performance.now(); velocity = 0;
        dragging = true; decided = false; horizontal = false;
        content.setPointerCapture(e.pointerId);
      });
      content.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const moveX = e.clientX - startX;
        const moveY = e.clientY - startY;
        if (!decided) {
          if (Math.abs(moveX) < 6 && Math.abs(moveY) < 6) return;
          decided = true;
          horizontal = Math.abs(moveX) > Math.abs(moveY);
          if (!horizontal) return;
        }
        if (!horizontal) return;
        e.preventDefault();
        const now = performance.now();
        const dt = Math.max(1, now - lastT);
        velocity = ((e.clientX - lastX) / dt) * 1000;
        lastX = e.clientX; lastT = now;
        const base = wrap.classList.contains('swiped') ? -SWIPE_REVEAL : 0;
        let raw = base + moveX;
        if (raw > 0) raw = rubberband(raw, SWIPE_OVERDRAG);
        else if (raw < -SWIPE_REVEAL) raw = -SWIPE_REVEAL - rubberband(-raw - SWIPE_REVEAL, SWIPE_OVERDRAG);
        spring.value = raw; spring.target = raw; spring.velocity = 0;
        render();
      });
      content.addEventListener('pointerup', (e) => {
        if (!dragging) return;
        dragging = false;
        if (content.hasPointerCapture(e.pointerId)) content.releasePointerCapture(e.pointerId);
        if (!decided) {
          if (wrap.classList.contains('swiped')) closeAllSwipes(container);
          return;
        }
        if (!horizontal) { settleTo(wrap.classList.contains('swiped') ? -SWIPE_REVEAL : 0); return; }
        const opening = velocity < -80 ? true : velocity > 80 ? false : spring.value < -SWIPE_REVEAL / 2;
        spring.velocity = velocity;
        settleTo(opening ? -SWIPE_REVEAL : 0);
      });
      content.addEventListener('pointercancel', () => {
        dragging = false;
        settleTo(wrap.classList.contains('swiped') ? -SWIPE_REVEAL : 0);
      });

      actionBtn.addEventListener('click', () => {
        deleteAccount(actionBtn.dataset.id);
      });
    });
  }

  let confirmOnConfirm = null;
  const confirmBackdrop = document.getElementById('confirmBackdrop');
  document.getElementById('confirmCancelBtn').addEventListener('click', () => {
    confirmBackdrop.classList.remove('open');
    confirmOnConfirm = null;
  });
  document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
    confirmBackdrop.classList.remove('open');
    const cb = confirmOnConfirm;
    confirmOnConfirm = null;
    if (cb) cb();
  });
  function showConfirmAlert(title, onConfirm) {
    document.getElementById('confirmTitle').textContent = title;
    confirmOnConfirm = onConfirm;
    confirmBackdrop.classList.add('open');
  }

  function deleteAccount(id, onDeleted) {
    const acc = accounts.find((a) => a.id === id);
    if (!acc) return;
    showConfirmAlert(`確定要刪除「${acc.name}」嗎？`, () => {
      accounts.forEach((a) => { if (a.paymentType === 'credit' && a.linkedAccountId === acc.id) a.linkedAccountId = null; });
      accounts.splice(accounts.indexOf(acc), 1);
      renderAccountList();
      renderSettingsList();
      renderOverview();
      showToast(`已刪除「${acc.name}」`);
      if (onDeleted) onDeleted();
    });
  }

  function currentAddType() {
    return typeToggle.querySelector('.type-opt.active').dataset.type;
  }
  function suggestedAccName(type, bankId) {
    if (type === 'cash') return '現金';
    const bank = banks.find((b) => b.id === bankId);
    const bankName = bank ? bank.name : '';
    if (type === 'bank') return bankName + '帳戶';
    return bankName + TYPE_LABELS[type];
  }
  let nameManuallyEdited = false;
  document.getElementById('newAccName').addEventListener('input', () => { nameManuallyEdited = true; });

  function bankSelectOptions() {
    return banks.map((b) => ({ value: b.id, label: b.name, icon: b.icon }));
  }
  function populateBankSelect() {
    const options = bankSelectOptions();
    if (options.length) setFieldSelectValue(document.getElementById('bankSelect'), options[0].label, options[0].value);
  }
  let addMethods = ['debit', 'zelle'];
  function populateMethodChips() {
    const el = document.getElementById('methodChips');
    el.innerHTML = Object.keys(METHOD_LABELS).map((m) => `
      <div class="method-chip ${addMethods.includes(m) ? 'active' : ''}" data-m="${m}">${METHOD_LABELS[m]}</div>
    `).join('');
    el.querySelectorAll('.method-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const m = chip.dataset.m;
        const i = addMethods.indexOf(m);
        if (i === -1) addMethods.push(m); else addMethods.splice(i, 1);
        chip.classList.toggle('active');
      });
    });
  }
  function currentNamingBankId(type) {
    if (type === 'bank') return document.getElementById('bankSelect').dataset.value;
    if (type === 'credit') {
      const linked = accounts.find((a) => a.id === document.getElementById('linkedAccountSelect').dataset.value);
      return linked ? linked.bankId : null;
    }
    return null;
  }
  function linkedAccountSelectOptions() {
    return accounts.filter((a) => a.paymentType !== 'credit').map((a) => ({ value: a.id, label: a.name, icon: TYPE_ICONS[a.paymentType] }));
  }
  function populateLinkedAccountSelect() {
    const el = document.getElementById('linkedAccountSelect');
    const options = linkedAccountSelectOptions();
    const chosen = options.find((o) => o.value === el.dataset.value) || options[0];
    setFieldSelectValue(el, chosen ? chosen.label : '請先新增銀行/現金帳戶', chosen ? chosen.value : '');
  }

  function updateBalanceFieldVisibility() {
    document.getElementById('balanceFields').style.display = currentAddType() !== 'credit' ? '' : 'none';
  }
  function updateSuggestedName() {
    if (nameManuallyEdited) return;
    const type = currentAddType();
    document.getElementById('newAccName').value = suggestedAccName(type, currentNamingBankId(type));
  }
  function updateFormFields() {
    const type = currentAddType();
    document.getElementById('bankFieldRow').style.display = type === 'bank' ? '' : 'none';
    document.getElementById('methodFields').style.display = type === 'bank' ? '' : 'none';
    document.getElementById('creditFields').style.display = type === 'credit' ? '' : 'none';
    if (type === 'bank') populateMethodChips();
    populateLinkedAccountSelect();
    updateSuggestedName();
    updateBalanceFieldVisibility();
  }
  wireFieldSelect(document.getElementById('bankSelect'), '選擇銀行', bankSelectOptions, updateFormFields);
  wireFieldSelect(document.getElementById('linkedAccountSelect'), '掛在哪個帳戶底下', linkedAccountSelectOptions, updateSuggestedName);

  populateBankSelect();
  updateFormFields();

  let nextAccountId = 100;
  document.getElementById('saveAccountBtn').addEventListener('click', () => {
    const type = currentAddType();
    const nameInput = document.getElementById('newAccName');
    const id = 'acc' + (nextAccountId++);

    if (type === 'credit') {
      const linkedAccountId = document.getElementById('linkedAccountSelect').dataset.value || null;
      const linkedAccount = accounts.find((a) => a.id === linkedAccountId);
      const bankId = linkedAccount ? linkedAccount.bankId : null;
      const limit = parseFloat(document.getElementById('newCreditLimit').value) || 0;
      let closingDay = parseInt(document.getElementById('newClosingDay').value, 10);
      if (isNaN(closingDay) || closingDay < 1 || closingDay > 28) closingDay = 1;
      const name = nameInput.value.trim() || suggestedAccName(type, bankId);
      accounts.push({ id, bankId, name, paymentType: 'credit', limit, spent: 0, linkedAccountId, closingDay, paidUpToClosing: null });
      finishAddAccount(name);
      return;
    }

    const bankId = type === 'bank' ? document.getElementById('bankSelect').dataset.value : null;
    const name = nameInput.value.trim() || suggestedAccName(type, bankId);
    const acc = {
      id, bankId, name, paymentType: type,
      startingBalance: parseFloat(document.getElementById('newAccBalance').value) || 0,
      spent: 0,
    };
    if (type === 'bank') acc.methods = addMethods.slice();
    accounts.push(acc);
    finishAddAccount(name);
  });
  function finishAddAccount(name) {
    document.getElementById('newAccName').value = '';
    nameManuallyEdited = false;
    document.getElementById('newAccBalance').value = '';
    document.getElementById('newCreditLimit').value = '';
    document.getElementById('newClosingDay').value = '';
    addMethods = ['debit', 'zelle'];
    updateFormFields();
    renderAccountList();
    renderOverview();
    showToast(`已新增「${name}」`);
    showScreen('list');
  }

  renderAccountList();
  renderOverview();

  const tabbar = document.getElementById('tabbar');
  const tabs = document.querySelectorAll('.tab');
  const indicator = document.getElementById('indicator');

  const BASE_WIDTH = 340, BASE_HEIGHT = 70;
  const PRESS_WIDTH = 368, PRESS_HEIGHT = 76;

  function capsuleRadius(height) { return height / 2; }

  const widthSpring = new Spring(260, 18, 1);
  const heightSpring = new Spring(260, 18, 1);
  widthSpring.set(BASE_WIDTH);
  heightSpring.set(BASE_HEIGHT);
  tabbar.style.width = BASE_WIDTH + 'px';
  tabbar.style.borderRadius = capsuleRadius(BASE_HEIGHT) + 'px';
  tabbar.style.height = BASE_HEIGHT + 'px';

  const indicatorX = new Spring(220, 20, 1);
  const indicatorW = new Spring(220, 20, 1);
  const INDICATOR_PAD = 6;

  function tabRect(tab) {
    const barRect = tabbar.getBoundingClientRect();
    const r = tab.getBoundingClientRect();
    return { x: r.left - barRect.left - tabbar.clientLeft, w: r.width };
  }

  function setIndicatorTarget(tab) {
    const { x, w } = tabRect(tab);
    indicatorX.setTarget(x + INDICATOR_PAD);
    indicatorW.setTarget(w - INDICATOR_PAD * 2);
  }

  {
    const active = tabbar.querySelector(':scope > .tab.active');
    const { x, w } = tabRect(active);
    indicatorX.set(x + INDICATOR_PAD);
    indicatorW.set(w - INDICATOR_PAD * 2);
  }

  let lastTick = performance.now();
  function tick(now) {
    const dt = Math.min((now - lastTick) / 1000, 0.032);
    lastTick = now;
    widthSpring.step(dt);
    heightSpring.step(dt);
    indicatorX.step(dt);
    indicatorW.step(dt);

    const radius = capsuleRadius(heightSpring.value);
    tabbar.style.width = widthSpring.value + 'px';
    tabbar.style.borderRadius = radius + 'px';
    tabbar.style.height = heightSpring.value + 'px';

    const activeTab = tabbar.querySelector(':scope > .tab.active');
    if (activeTab) setIndicatorTarget(activeTab);

    const innerMax = tabbar.clientWidth - INDICATOR_PAD;
    const renderedW = Math.min(indicatorW.value, innerMax - INDICATOR_PAD);
    const renderedX = Math.min(Math.max(indicatorX.value, INDICATOR_PAD), innerMax - renderedW);

    indicator.style.left = renderedX + 'px';
    indicator.style.width = renderedW + 'px';
    indicator.style.borderRadius = Math.max(0, radius - INDICATOR_PAD) + 'px';

    syncLens();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  function setBulge(on) {
    widthSpring.setTarget(on ? PRESS_WIDTH : BASE_WIDTH);
    heightSpring.setTarget(on ? PRESS_HEIGHT : BASE_HEIGHT);
  }

  function activateTab(tab) {
    const idx = Number(tab.dataset.i);
    showPage(pageOrder[idx]);
    if (tab.classList.contains('active')) return;
    tabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    refreshBgClone();
  }

  function tabAtPoint(clientX) {
    for (const t of tabs) {
      const r = t.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right) return t;
    }
    const firstRect = tabs[0].getBoundingClientRect();
    const lastRect = tabs[tabs.length - 1].getBoundingClientRect();
    if (clientX < firstRect.left) return tabs[0];
    if (clientX > lastRect.right) return tabs[tabs.length - 1];
    return null;
  }

  let tabDragging = false;

  tabbar.addEventListener('pointerdown', (e) => {
    tabDragging = true;
    tabbar.setPointerCapture(e.pointerId);
    setBulge(true);
    const hit = tabAtPoint(e.clientX);
    if (hit) activateTab(hit);
  });

  tabbar.addEventListener('pointermove', (e) => {
    if (!tabDragging) return;
    const hit = tabAtPoint(e.clientX);
    if (hit) activateTab(hit);
  });

  function endTabDrag(e) {
    if (!tabDragging) return;
    tabDragging = false;
    if (tabbar.hasPointerCapture(e.pointerId)) tabbar.releasePointerCapture(e.pointerId);
    setBulge(false);
  }
  tabbar.addEventListener('pointerup', endTabDrag);
  tabbar.addEventListener('pointercancel', endTabDrag);

  function roundedRectSDF(x, y, hw, hh, r) {
    const qx = Math.abs(x) - hw + r;
    const qy = Math.abs(y) - hh + r;
    return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
  }

  function buildDisplacementMap(w, h, radius) {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(w, h);
    const d = img.data;
    const hw = w / 2, hh = h / 2;
    const maxDepth = Math.max(1, Math.min(radius, hw, hh));
    const eps = 0.75;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const px = x - hw, py = y - hh;
        const sdf = roundedRectSDF(px, py, hw, hh, radius);
        const i = (y * w + x) * 4;
        if (sdf >= 0) {
          d[i] = 128; d[i + 1] = 128; d[i + 2] = 128; d[i + 3] = 255;
          continue;
        }
        const depth = -sdf;
        const t = Math.min(depth / maxDepth, 1);
        const intensity = 0.55 + 0.45 * Math.pow(1 - t, 1.4);
        const gx = (roundedRectSDF(px + eps, py, hw, hh, radius) - roundedRectSDF(px - eps, py, hw, hh, radius)) / (2 * eps);
        const gy = (roundedRectSDF(px, py + eps, hw, hh, radius) - roundedRectSDF(px, py - eps, hw, hh, radius)) / (2 * eps);
        const glen = Math.hypot(gx, gy) || 1;
        const dx = -(gx / glen) * intensity;
        const dy = -(gy / glen) * intensity;
        d[i] = (dx * 0.5 + 0.5) * 255;
        d[i + 1] = (dy * 0.5 + 0.5) * 255;
        d[i + 2] = 128;
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL('image/png');
  }

  let lastMapKey = '';
  function refreshDisplacementMapIfNeeded() {
    const w = Math.round(indicatorW.value);
    const h = Math.round(indicator.getBoundingClientRect().height);
    const r = Math.round(Math.max(0, capsuleRadius(heightSpring.value) - INDICATOR_PAD));
    const key = w + 'x' + h + 'r' + r;
    if (key === lastMapKey || w < 4 || h < 4) return;
    lastMapKey = key;
    document.getElementById('tabDispMap').setAttribute('href', buildDisplacementMap(w, h, r));
  }

  function refreshBgClone() {
    const tabbarClone = tabbar.cloneNode(true);
    tabbarClone.removeAttribute('id');
    const cloneIndicator = tabbarClone.querySelector('#indicator');
    if (cloneIndicator) cloneIndicator.remove();
    document.getElementById('bgSourceBody').innerHTML = tabbarClone.outerHTML;
  }
  refreshBgClone();

  function syncLens() {
    refreshDisplacementMapIfNeeded();
    const x = indicatorX.value;
    const lensUse = document.getElementById('lensUse');
    lensUse.setAttribute('x', -x - 6);
    lensUse.setAttribute('y', -6);
  }
  refreshDisplacementMapIfNeeded();

  const themeToggle = document.getElementById('themeToggle');
  themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.dataset.theme === 'dark';
    document.documentElement.dataset.theme = isDark ? 'light' : 'dark';
    themeToggle.textContent = isDark ? '🌙 深色' : '☀️ 淺色';
    refreshBgClone();
  });

  const btnHeroVariantA = document.getElementById('btnHeroVariantA');
  const btnHeroVariantB = document.getElementById('btnHeroVariantB');
  const ovVariantA = document.getElementById('ovVariantA');
  const ovVariantB = document.getElementById('ovVariantB');
  btnHeroVariantA.addEventListener('click', () => {
    btnHeroVariantA.classList.add('active'); btnHeroVariantB.classList.remove('active');
    ovVariantA.style.display = ''; ovVariantB.style.display = 'none';
  });
  btnHeroVariantB.addEventListener('click', () => {
    btnHeroVariantB.classList.add('active'); btnHeroVariantA.classList.remove('active');
    ovVariantB.style.display = ''; ovVariantA.style.display = 'none';
  });

  // ===================== 分析頁 (merged from analysis-demo.html) =====================
  // 本月分類 / 近半年趨勢：目前沒有真的收入功能與逐月分類統計，先沿用示意假資料。
  let CATS = [
    { id: 'food',      name: '食物', color: '#f5a623' },
    { id: 'drink',     name: '飲料', color: '#06b6d4' },
    { id: 'housing',   name: '居住', color: '#8b5cf6' },
    { id: 'transport', name: '交通', color: '#ec4899' },
    { id: 'living',    name: '生活', color: '#10b981' },
    { id: 'other',     name: '其他', color: '#6b7280' },
  ];
  const CAT_DARK = { food: '#ffb84d', drink: '#2bc4c8', housing: '#a78bfa', transport: '#f472b6', living: '#34d399', other: '#8a97a0' };
  let expenseByCat = { food: 4200, drink: 850, housing: 3500, transport: 1200, living: 980, other: 320 };
  let incomeByCat = {};
  let trendMonths = ['4月', '5月', '6月', '7月', '8月', '9月'];
  let trendExpense = [3200, 2800, 9800, 4100, 3900, 11050];
  let trendIncome = [0, 0, 0, 0, 0, 0];
  let trendBalance = trendIncome.map((v, i) => v - trendExpense[i]);
  let expenseTotal = Object.values(expenseByCat).reduce((a, b) => a + b, 0);
  let incomeTotal = 0;
  let balanceTotal = incomeTotal - expenseTotal;

  // 上層 tab（收支/帳單/債務）：底線指示器，跟底部 tabbar 共用同一份 Spring 實作
  const topTabsEl = document.getElementById('topTabs');
  const topTabEls = Array.from(topTabsEl.querySelectorAll('.top-tab'));
  const topTabIndicator = document.getElementById('topTabIndicator');
  const topTabX = new Spring(220, 20, 1);
  const topTabW = new Spring(220, 20, 1);
  const analysisPanels = { ie: document.getElementById('panelIe'), bills: document.getElementById('panelBills'), debt: document.getElementById('panelDebt') };

  function topTabTargetFor(el) {
    const tabsRect = topTabsEl.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const textW = Math.min(36, r.width * 0.55);
    return { x: (r.left - tabsRect.left) + (r.width - textW) / 2, w: textW };
  }
  function selectTopTab(name, animate) {
    topTabEls.forEach((el) => el.classList.toggle('active', el.dataset.tab === name));
    Object.keys(analysisPanels).forEach((k) => analysisPanels[k].classList.toggle('visible', k === name));
    if (name === 'bills') renderBills();
    if (name === 'debt') renderDebt();
    const activeEl = topTabEls.find((el) => el.dataset.tab === name);
    const t = topTabTargetFor(activeEl);
    if (animate === false) { topTabX.value = topTabX.target = t.x; topTabW.value = topTabW.target = t.w; renderTopTabIndicator(); }
    else { topTabX.target = t.x; topTabW.target = t.w; }
  }
  function renderTopTabIndicator() {
    topTabIndicator.style.transform = `translateX(${topTabX.value}px)`;
    topTabIndicator.style.width = `${topTabW.value}px`;
  }
  topTabEls.forEach((el) => el.addEventListener('pointerdown', () => selectTopTab(el.dataset.tab, true)));

  // segmented pill 共用邏輯（收支的 支出/收入、趨勢的 收入/支出/結餘 切換用）
  function setupSegmented(rootId, pillId, onChange) {
    const root = document.getElementById(rootId);
    const pill = document.getElementById(pillId);
    const opts = Array.from(root.querySelectorAll('.seg-opt'));
    const x = new Spring(260, 24, 1);
    const w = new Spring(260, 24, 1);
    let activeIndex = opts.findIndex((o) => o.classList.contains('active'));

    function targetFor(el) {
      const rr = root.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return { x: r.left - rr.left - 3, w: r.width };
    }
    function place(animate) {
      const t = targetFor(opts[activeIndex]);
      if (animate === false) { x.value = x.target = t.x; w.value = w.target = t.w; tick(); }
      else { x.target = t.x; w.target = t.w; }
    }
    function tick() {
      pill.style.transform = `translateX(${x.value}px)`;
      pill.style.width = `${w.value}px`;
    }
    function select(i) {
      if (i === activeIndex) return;
      activeIndex = i;
      opts.forEach((o, idx) => o.classList.toggle('active', idx === i));
      place(true);
      if (onChange) onChange(i);
    }
    opts.forEach((o, i) => o.addEventListener('pointerdown', () => select(i)));
    window.addEventListener('resize', () => place(false));
    place(false);
    return { spring: { x, w, tick }, select, layout: () => place(false), getIndex: () => activeIndex };
  }

  const ieSeg = setupSegmented('ieSegmented', 'ieSegPill', () => renderDonut());
  const trendSeg = setupSegmented('trendSegmented', 'trendSegPill', () => renderTrend());

  // 圓餅圖（手繪 SVG，支援點擊切換）
  let donutSelected = null;
  function buildDonutData() {
    const isIncome = ieSeg.getIndex() === 0;
    const src = isIncome ? incomeByCat : expenseByCat;
    const total = isIncome ? incomeTotal : expenseTotal;
    const slices = CATS.map((c) => ({ id: c.id, name: c.name, color: c.color, amount: src[c.id] || 0 }))
      .filter((s) => s.amount > 0)
      .sort((a, b) => b.amount - a.amount);
    return { slices, total };
  }
  function renderDonut() {
    donutSelected = null;
    const area = document.getElementById('donutArea');
    const data = buildDonutData();
    const isDark = document.documentElement.dataset.theme === 'dark';

    if (data.total <= 0 || data.slices.length === 0) {
      area.innerHTML = `<div class="donut-empty">${ieSeg.getIndex() === 0 ? '本月尚無收入紀錄' : '本月尚無支出紀錄'}</div>`;
      return;
    }

    const r = 80, cx = 100, cy = 100, sw = 26;
    const circumference = 2 * Math.PI * r;
    const gapPx = 3;
    let cumulative = 0;
    const svgSlices = data.slices.map((s) => {
      const pct = s.amount / data.total;
      const dash = Math.max(pct * circumference - gapPx, 1);
      const offset = -(cumulative / data.total) * circumference;
      cumulative += s.amount;
      const color = isDark ? (CAT_DARK[s.id] || s.color) : s.color;
      return `<circle class="donut-slice" data-cat="${s.id}" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="butt" stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${offset}"></circle>`;
    }).join('');

    const legendRows = data.slices.map((s) => {
      const pct = Math.round((s.amount / data.total) * 1000) / 10;
      const color = isDark ? (CAT_DARK[s.id] || s.color) : s.color;
      return `<div class="legend-row" data-cat="${s.id}">
        <div class="legend-dot" style="background:${color}"></div>
        <div class="legend-name">${esc(s.name)}</div>
        <div class="legend-pct">${pct}%</div>
        <div class="legend-amt">${fmt(s.amount)}</div>
      </div>`;
    }).join('');

    area.innerHTML = `
      <div class="donut-wrap" id="donutWrap">
        <svg viewBox="0 0 200 200" style="transform:rotate(-90deg);width:100%;height:100%;">${svgSlices}</svg>
        <div class="donut-center">
          <div class="donut-center-label" id="donutLabel">總計</div>
          <div class="donut-center-value" id="donutValue">${fmt(data.total)}</div>
          <div class="donut-center-pct" id="donutPct" style="display:none;"></div>
        </div>
      </div>
      <div class="legend-list">${legendRows}</div>`;

    function applySelection(catId) {
      donutSelected = catId;
      const label = area.querySelector('#donutLabel');
      const value = area.querySelector('#donutValue');
      const pctEl = area.querySelector('#donutPct');
      const rows = area.querySelectorAll('.legend-row');
      const slices = area.querySelectorAll('.donut-slice');
      [label, value, pctEl].forEach((el) => (el.style.opacity = '0'));
      setTimeout(() => {
        if (catId === null) {
          label.textContent = '總計';
          value.textContent = fmt(data.total);
          pctEl.style.display = 'none';
          rows.forEach((r) => r.classList.remove('dim'));
          slices.forEach((s) => (s.style.opacity = '1'));
        } else {
          const s = data.slices.find((x) => x.id === catId);
          const pct = Math.round((s.amount / data.total) * 1000) / 10;
          label.textContent = s.name;
          value.textContent = fmt(s.amount);
          pctEl.style.display = 'block';
          pctEl.textContent = `${pct}%`;
          rows.forEach((r) => r.classList.toggle('dim', r.dataset.cat !== catId));
          slices.forEach((el) => (el.style.opacity = el.dataset.cat === catId ? '1' : '0.25'));
        }
        [label, value, pctEl].forEach((el) => (el.style.opacity = '1'));
      }, 90);
    }

    area.querySelectorAll('.donut-slice').forEach((el) => {
      el.addEventListener('pointerdown', () => applySelection(donutSelected === el.dataset.cat ? null : el.dataset.cat));
    });
    area.querySelectorAll('.legend-row').forEach((el) => {
      el.addEventListener('pointerdown', () => applySelection(donutSelected === el.dataset.cat ? null : el.dataset.cat));
    });
  }

  // 趨勢折線圖（手繪 SVG）
  function niceTicks(max) {
    if (max <= 0) return [0, 1];
    const steps = 4;
    const raw = max / steps;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
    const step = niceNorm * mag;
    const ticks = [];
    for (let i = 0; i <= steps; i++) ticks.push(i * step);
    return ticks;
  }
  function renderTrend() {
    const idx = trendSeg.getIndex();
    const series = idx === 0 ? trendIncome : idx === 1 ? trendExpense : trendBalance;
    const label = idx === 0 ? '收入' : idx === 1 ? '支出' : '結餘';
    document.getElementById('trendMonthLabel').textContent = `本月${label}`;

    const current = series[series.length - 1];
    const prev = series[series.length - 2];
    const delta = current - prev;
    const monthValEl = document.getElementById('trendMonthValue');
    monthValEl.textContent = fmt(current);
    monthValEl.style.color = idx === 2 && current < 0 ? 'var(--danger)' : '';

    const deltaEl = document.getElementById('trendDeltaValue');
    const deltaWord = delta === 0 ? '持平' : delta > 0 ? '增加' : '減少';
    deltaEl.textContent = `${deltaWord} ${fmt(Math.abs(delta))}`;

    const svg = document.getElementById('trendChart');
    const W = 320, H = 148, padL = 34, padR = 10, padT = 10, padB = 22;
    const plotW = W - padL - padR, plotH = H - padT - padB;

    const allVals = series.concat([0]);
    const minV = Math.min(...allVals);
    const maxV = Math.max(...allVals);
    const ticks = niceTicks(Math.max(Math.abs(minV), Math.abs(maxV)));
    const scaleMax = ticks[ticks.length - 1];
    const scaleMin = minV < 0 ? -scaleMax : 0;
    const span = scaleMax - scaleMin || 1;

    const xAt = (i) => padL + (i / (series.length - 1)) * plotW;
    const yAt = (v) => padT + plotH - ((v - scaleMin) / span) * plotH;

    let gridLines = '';
    const gridVals = scaleMin < 0 ? ticks.concat(ticks.slice(1).map((t) => -t)) : ticks;
    gridVals.forEach((v) => {
      const y = yAt(v);
      gridLines += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="var(--border)" stroke-width="1"></line>`;
      gridLines += `<text x="4" y="${y + 3}" font-size="9" fill="var(--muted)">${Math.abs(v) >= 1000 ? Math.round(v / 1000) + 'K' : Math.round(v)}</text>`;
    });

    const pts = series.map((v, i) => [xAt(i), yAt(v)]);
    const solidPts = pts.slice(0, pts.length - 1);
    const lastSeg = pts.slice(pts.length - 2);
    const pathFor = (list) => list.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`).join(' ');
    const solidPath = pathFor(solidPts);
    const dashedPath = pathFor(lastSeg);
    const lastX = pts[pts.length - 1][0];
    const lastY = pts[pts.length - 1][1];
    const baseY = yAt(0);

    const dots = pts.map((p, i) => {
      const isLast = i === pts.length - 1;
      return `<circle class="trend-dot${isLast ? ' active' : ''}" cx="${p[0]}" cy="${p[1]}" r="${isLast ? 5 : 3}" fill="var(--accent2)" stroke="var(--card)" stroke-width="1.5"></circle>`;
    }).join('');
    const monthLabels = trendMonths.map((m, i) => `<text x="${xAt(i)}" y="${H - 4}" font-size="9.5" fill="var(--muted)" text-anchor="middle">${m}</text>`).join('');
    const zeroLine = scaleMin < 0 ? `<line x1="${padL}" y1="${baseY}" x2="${W - padR}" y2="${baseY}" stroke="var(--muted)" stroke-width="1" stroke-opacity="0.4"></line>` : '';

    svg.innerHTML = gridLines + zeroLine +
      `<line x1="${lastX}" y1="${lastY}" x2="${lastX}" y2="${baseY}" stroke="var(--accent2)" stroke-width="1" stroke-dasharray="3 3" stroke-opacity="0.5"></line>` +
      `<path d="${solidPath}" fill="none" stroke="var(--accent2)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>` +
      `<path d="${dashedPath}" fill="none" stroke="var(--accent2)" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="1 6"></path>` +
      dots + monthLabels;
  }

  // 帳單 tab：改用真實的 accounts / creditTransactions / statementSplit（單一真實信用卡），不再是獨立假資料
  function analysisCreditAccounts() { return accounts.filter((a) => a.paymentType === 'credit'); }

  function renderBills() {
    const rows = analysisCreditAccounts().map((acc) => ({ acc, stmt: statementSplit(acc) }));
    const unpaid = rows.reduce((s, x) => s + x.stmt.billed, 0);
    const unbilled = rows.reduce((s, x) => s + x.stmt.unbilled, 0);
    document.getElementById('billUnpaid').textContent = fmt(unpaid);
    document.getElementById('billUnbilled').textContent = fmt(unbilled);
    document.getElementById('billCardList').innerHTML = rows.map(({ acc, stmt }) => `
      <div class="list-row">
        <div class="row-icon">${ICON_CREDIT}</div>
        <div class="row-body">
          <div class="row-name">${acc.name}</div>
          <div class="row-sub">已出帳 ${fmt(stmt.billed)}・未出帳 ${fmt(stmt.unbilled)}</div>
        </div>
      </div>`).join('');
  }

  // 「前往繳費」：不再自己開一個獨立的繳費 sheet，改成跳回帳戶分頁的信用卡明細畫面，用同一套真實付款流程
  document.getElementById('goPayBtn').addEventListener('click', () => {
    activateTab(tabs[1]);
    renderDetail();
    showScreen('detail');
    openPaySheet();
  });

  // 債務 tab：改用真實 accounts 資料（目前只有一張真實信用卡），拿掉原本 demo 專用的「切換負債情境」按鈕
  function renderDebt() {
    const cards = analysisCreditAccounts();
    const totalLimit = cards.reduce((s, c) => s + c.limit, 0);
    const totalSpent = cards.reduce((s, c) => s + c.spent, 0);
    const pct = totalLimit > 0 ? totalSpent / totalLimit : 0;
    const pctRounded = Math.round(pct * 1000) / 10;

    const r = 28, circumference = 2 * Math.PI * r;
    const dash = Math.min(pct, 1) * circumference;
    const arc = document.getElementById('gaugeArc');
    arc.setAttribute('stroke-dasharray', `${dash} ${circumference - dash}`);
    document.getElementById('gaugePct').textContent = `${pctRounded}%`;
    document.getElementById('gaugeAmt').textContent = `${fmt(totalSpent)} / ${fmt(totalLimit)}`;
    document.getElementById('gaugeSub').textContent = `${cards.length} 張信用卡`;

    document.getElementById('debtCardList').innerHTML = cards.map((c) => {
      const cPct = c.limit > 0 ? Math.round((c.spent / c.limit) * 100) : 0;
      return `
      <div class="list-row">
        <div class="row-icon">${ICON_CREDIT}</div>
        <div class="row-body">
          <div class="row-name">${esc(c.name)}</div>
          <div class="row-sub ok">正常</div>
        </div>
        <div class="row-amt-group">
          <div class="row-amt credit">${fmt(c.spent)}</div>
          <div class="row-amt-sub">額度 ${fmt(c.limit)}・${cPct}%</div>
        </div>
      </div>`;
    }).join('');
  }

  function refreshActiveAnalysisTab() {
    const active = topTabEls.find((el) => el.classList.contains('active'));
    if (!active) return;
    // 分析頁原先在 display:none 時初始化，當時量到的寬度是 0；顯示後重新定位，初始選取項也會立即有浮起材質。
    requestAnimationFrame(() => { ieSeg.layout(); trendSeg.layout(); });
    if (active.dataset.tab === 'bills') renderBills();
    if (active.dataset.tab === 'debt') renderDebt();
  }

  function renderAnalysisSummary() {
    const balEl = document.getElementById('statBalance');
    balEl.textContent = fmt(balanceTotal);
    balEl.classList.toggle('negative', balanceTotal < 0);
    document.getElementById('statIncome').textContent = fmt(incomeTotal);
    document.getElementById('statExpense').textContent = fmt(-expenseTotal);
  }

  let analysisLastTime = null;
  function analysisLoop(t) {
    if (analysisLastTime === null) analysisLastTime = t;
    const dt = Math.min((t - analysisLastTime) / 1000, 0.05);
    analysisLastTime = t;
    topTabX.step(dt); topTabW.step(dt); renderTopTabIndicator();
    ieSeg.spring.x.step(dt); ieSeg.spring.w.step(dt); ieSeg.spring.tick();
    trendSeg.spring.x.step(dt); trendSeg.spring.w.step(dt); trendSeg.spring.tick();
    requestAnimationFrame(analysisLoop);
  }
  requestAnimationFrame(analysisLoop);

  renderAnalysisSummary();
  renderDonut();
  renderTrend();
  renderBills();
  renderDebt();
  selectTopTab('ie', false);

  // ================= 我的：設定直接使用整合 demo 的帳戶／交易資料，不是獨立假狀態。 =================
  const MY_STORAGE_KEY = 'expense-tracker-combined-settings-v1';
  const MY_CATEGORY_COLORS = ['#f5a623','#06b6d4','#8b5cf6','#ec4899','#f97316','#10b981','#64748b','#3b82f6','#6b7280'];
  // 單一線性圖示庫：所有可選圖示共用 24px viewBox、round cap/join 與相同 stroke，不能在個別類別臨時手畫。
  const MY_CATEGORY_ICON_PATHS = { book:'M5 4.5A3.5 3.5 0 0 1 8.5 3H20v16H8.5A3.5 3.5 0 0 0 5 22V4.5Zm0 0V19.5M9 7h7M9 11h7', food:'M4 3v7a3 3 0 0 0 3 3v8M7 3v7M10 3v7a3 3 0 0 1-3 3M16 3v18M16 3c3 2 4 5 4 8h-4', drink:'M7 3h10l-1 18H8L7 3Zm1 5h8m-5-5 4 5', grocery:'M3 4h2l2 11h10l2-8H6m2 12h.01M17 19h.01', transit:'M5 16V6c0-2 2-3 7-3s7 1 7 3v10M5 11h14M7 20l2-4m8 4-2-4M8 7h8', play:'M4 6h16v12H4zM8 10h.01M16 10h.01m-7 4c2 2 4 2 6 0', home:'M4 10 12 3l8 7v10h-6v-6h-4v6H4z', rent:'M3 21h18M5 21V8l7-5 7 5v13M9 12h6', school:'m3 10 9-5 9 5-9 5-9-5Zm4 2v5c3 2 7 2 10 0v-5', cart:'M3 4h2l2 11h10l2-8H6m2 12h.01M17 19h.01', coffee:'M5 8h11v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8Zm11 2h2a2 2 0 0 1 0 4h-2M7 4v2m4-2v2m4-2v2', medical:'M12 5v14M5 12h14', heart:'M20 8.5C20 14 12 19 12 19S4 14 4 8.5A4.2 4.2 0 0 1 12 6a4.2 4.2 0 0 1 8 2.5Z', gift:'M4 10h16v10H4zM12 10v10M3 6h18v4H3zM12 6H8.7a2 2 0 1 1 1.5-3.3C11.5 3.7 12 6 12 6Zm0 0h3.3a2 2 0 1 0-1.5-3.3C12.5 3.7 12 6 12 6Z', phone:'M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 15h2', fitness:'M6 9v6m12-6v6M3 11v2m18-2v2M6 12h12M8 8v8m8-8v8', travel:'M3 13h7l3 7h2l-1-7h5a2 2 0 0 0 0-4h-5l1-7h-2l-3 7H3', pet:'M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm8 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-12 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm16 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-8 0c-3.2 0-5 2.4-5 4.4 0 1.4 1 2.6 2.5 2.6 1 0 1.4-.5 2.5-.5s1.5.5 2.5.5c1.5 0 2.5-1.2 2.5-2.6 0-2-1.8-4.4-5-4.4Z', more:'M5 12h.01M12 12h.01M19 12h.01' };
  const MY_CATEGORY_ICONS = Object.keys(MY_CATEGORY_ICON_PATHS).filter(icon => icon !== 'book');
  const MY_BOOK_ICONS = ['book', ...MY_CATEGORY_ICONS];
  const myCategorySvg = icon => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${MY_CATEGORY_ICON_PATHS[icon] || MY_CATEGORY_ICON_PATHS.more}"/></svg>`;
  const defaultMyState = () => ({
    bookName: '我的帳本',
    bookIcon: 'book',
    bookColor: '#06b6d4',
    customColors: [],
    pairCode: String(Math.floor(100000 + Math.random() * 900000)),
    appearance: 'light',
    tipPresets: [15,18,20,22,25],
    categories: ['食物','飲料','雜貨','交通','娛樂','生活','房租','學費','其他'].map((name, index) => ({ id: name, name, icon: MY_CATEGORY_ICONS[index], color: MY_CATEGORY_COLORS[index], exclude: ['房租','學費'].includes(name) })),
  });
  function loadMyState() { return window.ledger.settingsView(); }
  let myState = loadMyState();
  function saveMyState() { try { localStorage.setItem(MY_STORAGE_KEY, JSON.stringify(myState)); } catch {} }
  function appearanceLabel(value) { return ({ light:'淺色', system:'跟隨系統', dark:'深色' })[value] || '淺色'; }
  function applyAppearance() {
    const mode = myState.appearance === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : myState.appearance;
    document.documentElement.dataset.theme = mode === 'dark' ? 'dark' : 'light';
    themeToggle.textContent = mode === 'dark' ? '☀️ 淺色' : '🌙 深色';
    refreshBgClone();
  }
  const myIcons = {
    link:'<svg viewBox="0 0 24 24"><path d="M10 13.5a4.5 4.5 0 0 0 6.36.14l2-2a4.5 4.5 0 0 0-6.36-6.36l-1.15 1.15"/><path d="M14 10.5a4.5 4.5 0 0 0-6.36-.14l-2 2A4.5 4.5 0 0 0 12 18.72l1.15-1.15"/></svg>',
    appearance:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5"/><path d="M12 4.5v15M4.5 12h15"/></svg>',
    tag:'<svg viewBox="0 0 24 24"><path d="M20 13.5 13.5 20a2.1 2.1 0 0 1-3 0L4 13.5V4h9.5L20 10.5a2.1 2.1 0 0 1 0 3Z"/><circle cx="8.5" cy="8.5" r="1"/></svg>',
    card:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 10h18M7 15h3"/></svg>',
    tip:'<svg viewBox="0 0 24 24"><path d="M12 3v18M7.5 7.5c0-1.6 1.7-2.7 4.3-2.7 2.4 0 4.1 1 4.1 2.6 0 4.2-8.5 1.5-8.5 5.7 0 1.7 1.8 2.9 4.5 2.9 2.5 0 4.3-1.1 4.3-2.8"/></svg>',
    download:'<svg viewBox="0 0 24 24"><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 16v3h14v-3"/></svg>',
    upload:'<svg viewBox="0 0 24 24"><path d="M12 21V10m0 0 4 4m-4-4-4 4M5 8V5h14v3"/></svg>',
    export:'<svg viewBox="0 0 24 24"><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 15v4h14v-4"/><path d="M19 8h2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8h2"/></svg>',
    trash:'<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"/></svg>',
  };
  function renderMy() {
    document.getElementById('myBookName').textContent = myState.bookName;
    document.getElementById('myBookIcon').innerHTML = myCategorySvg(myState.bookIcon);
    // 帳本 icon 的顏色仍可在編輯器修改；首頁則固定白色圓形材質，保持主視覺對比。
    document.getElementById('myBookIcon').style.setProperty('--book-color', myState.bookColor);
    document.getElementById('myPairCode').textContent = myState.pairCode.replace(/(\d{3})(\d{3})/, '$1 $2');
    document.getElementById('myAppearanceValue').textContent = appearanceLabel(myState.appearance);
    document.getElementById('myTipValue').textContent = myState.tipPresets.map(value => value + '%').join('、');
    document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = myIcons[el.dataset.icon] || ''; });
  }
  const mySheet = document.getElementById('mySheet');
  const mySheetTitle = document.getElementById('mySheetTitle');
  const mySheetBody = document.getElementById('mySheetBody');
  function openMySheet(title, body) { [pickerSheet, paySheet, editSheet].forEach(sheet => { sheet?.classList.remove('open'); sheet?.classList.add('is-suppressed'); }); mySheet.classList.remove('is-suppressed'); mySheetTitle.textContent = title; mySheetBody.innerHTML = body; sheetBackdrop.classList.add('open'); mySheet.classList.add('open'); }
  function closeMySheet() { if (!mySheet) return; mySheet.classList.remove('open'); if (!pickerSheet.classList.contains('open') && !paySheet.classList.contains('open') && !editSheet.classList.contains('open')) sheetBackdrop.classList.remove('open'); }
  document.getElementById('mySheetClose').addEventListener('click', closeMySheet);
  function esc(value) { return String(value).replace(/[&<>'"]/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' })[char]); }
  function openBookNameSheet(category) {
    const editing = category ? myState.categories.find(item => item.id === category) : { id:'book', name:myState.bookName, icon:myState.bookIcon, color:myState.bookColor, isBook:true };
    const target = editing.isBook ? 'book' : 'category';
    const iconChoices = editing.isBook ? MY_BOOK_ICONS : MY_CATEGORY_ICONS;
    const colorChoices = [...new Set([...MY_CATEGORY_COLORS, ...myState.customColors])];
    openMySheet(editing.isBook ? '帳本設定' : '編輯類別', `<div class="my-editor-label">${editing.isBook ? '名稱' : '類別名稱'}</div><input class="field-input" id="myNameInput" maxlength="24" value="${esc(editing.name)}" /><div class="field-label">圖示</div><div class="my-icon-grid">${iconChoices.map(icon => `<button class="my-icon-choice ${editing.icon===icon?'active':''}" aria-label="選取圖示" data-my-action="select-icon" data-my-target="${target}" data-category-id="${esc(editing.id)}" data-icon-key="${icon}">${myCategorySvg(icon)}</button>`).join('')}</div><div class="field-label">顏色</div><div class="my-color-row">${colorChoices.map(color => `<button class="my-color-choice ${editing.color===color?'active':''}" aria-label="選取顏色" style="background:${color}" data-my-action="select-color" data-my-target="${target}" data-category-id="${esc(editing.id)}" data-color="${color}"></button>`).join('')}</div><div class="my-custom-color"><span>新增顏色</span><input id="myCustomColor" type="color" value="#1a9b9e" aria-label="自訂顏色" /><button type="button" data-my-action="add-custom-color" data-my-target="${target}" data-category-id="${editing.isBook ? '' : esc(editing.id)}">加入</button></div><div class="my-sheet-actions"><button class="my-sheet-action" data-my-action="save-name" data-my-target="${target}" data-category-id="${editing.isBook ? '' : esc(editing.id)}">儲存</button>${editing.isBook ? '' : '<button class="my-sheet-action danger" data-my-action="delete-category" data-category-id="'+esc(editing.id)+'">刪除類別</button>'}</div>`);
    requestAnimationFrame(() => document.getElementById('myNameInput').focus());
  }
  function openCategoriesSheet() {
    const rows = myState.categories.map(item => `<div class="my-category-row"><span class="my-category-symbol" style="background:${item.color}">${myCategorySvg(item.icon)}</span><button class="my-category-name" data-my-action="edit-category" data-category-id="${esc(item.id)}">${esc(item.name)}</button><button class="ios-switch ${item.exclude ? '' : 'on'}" data-my-action="toggle-chart" data-category-id="${esc(item.id)}" role="switch" aria-checked="${!item.exclude}"><span class="ios-switch-knob"></span></button></div>`).join('');
    openMySheet('類別管理', `<p class="my-sheet-note">開關控制是否納入消費結構圖表。房租、學費預設排除，但仍會保留在明細、帳戶餘額與 CSV。</p><div class="my-list">${rows}<button class="my-add-inline" data-my-action="add-category">＋ 新增類別</button></div>`);
  }
  function openTipsSheet() {
    const values = [...new Set([0,15,18,20,22,25,...myState.tipPresets])].sort((a,b) => a-b);
    openMySheet('小費快速預設', `<p class="my-sheet-note">新增交易時會顯示這些常用百分比。點一下即可加入或移除。</p>${values.map(value => `<button class="my-setting-option ${myState.tipPresets.includes(value) ? 'active' : ''}" data-my-action="toggle-tip" data-tip="${value}"><span>${value === 0 ? '無服務費' : value + '%'}</span><span class="check">${myState.tipPresets.includes(value) ? '✓' : ''}</span></button>`).join('')}<div class="field-label">自訂百分比</div><div style="display:flex;gap:8px"><input class="field-input" id="myCustomTip" type="number" inputmode="decimal" min="0" max="100" placeholder="例如 17.5" /><button class="my-sheet-action" style="width:88px" data-my-action="add-custom-tip">新增</button></div>`);
  }
  function openAppearanceSheet() { openMySheet('外觀', ['light','system','dark'].map(value => `<button class="my-setting-option ${myState.appearance === value ? 'active' : ''}" data-my-action="set-appearance" data-appearance="${value}"><span>${appearanceLabel(value)}</span><span class="check">${myState.appearance === value ? '✓' : ''}</span></button>`).join('')); }
  function downloadFile(name, type, content) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 0); }
  function exportBackup() { downloadFile('expense-tracker-backup.json', 'application/json', JSON.stringify({ version:1, settings:myState, accounts, transactions:creditTransactions }, null, 2)); showToast('完整備份已匯出'); }
  function exportCsv() { const rows = [['日期','分類','名稱','帳戶','金額'], ...creditTransactions.map(tx => [tx.iso,tx.category,tx.name,accounts.find(account => account.id === tx.accountId)?.name || '',tx.amount])]; downloadFile('expense-tracker.csv','text/csv;charset=utf-8','\uFEFF'+rows.map(row => row.map(value => '"'+String(value).replaceAll('"','""')+'"').join(',')).join('\n')); showToast('CSV 已匯出'); }
  document.getElementById('myEditBook').addEventListener('click', () => openBookNameSheet());
  document.getElementById('myCopyCode').addEventListener('click', async () => { try { await navigator.clipboard.writeText(myState.pairCode); showToast('配對代碼已複製'); } catch { showToast('配對代碼：' + myState.pairCode); } });
  document.getElementById('myJoinBook').addEventListener('click', () => openMySheet('加入共享帳本', '<p class="my-sheet-note">輸入另一方提供的六碼代碼。Firebase 串接後，這會下載並持續同步該帳本資料。</p><div class="field-label" style="margin-top:0">配對代碼</div><input class="field-input" id="myJoinCode" inputmode="numeric" maxlength="7" placeholder="例如 123 456" /><div class="my-sheet-actions"><button class="my-sheet-action" data-my-action="join-book">加入</button></div>'));
  document.getElementById('myAppearance').addEventListener('click', openAppearanceSheet);
  document.getElementById('myCategories').addEventListener('click', openCategoriesSheet);
  document.getElementById('myPayments').addEventListener('click', () => { closeMySheet(); activateTab(tabs[1]); showScreen('list'); showToast('可在帳戶頁管理付款方式'); });
  document.getElementById('myTips').addEventListener('click', openTipsSheet);
  document.getElementById('myBackup').addEventListener('click', exportBackup);
  document.getElementById('myRestore').addEventListener('click', () => document.getElementById('myRestoreInput').click());
  document.getElementById('myExportCsv').addEventListener('click', exportCsv);
  document.getElementById('myClear').addEventListener('click', () => showConfirmAlert('確定清除這個 demo 的帳戶、交易與設定嗎？此動作無法復原。', () => { accounts.splice(0); creditTransactions.splice(0); myState = defaultMyState(); saveMyState(); renderMy(); renderAccountList(); renderOverview(); renderAnalysisSummary(); renderDonut(); renderBills(); renderDebt(); showToast('資料已清除'); }));
  mySheet.addEventListener('click', event => {
    const button = event.target.closest('[data-my-action]'); if (!button) return;
    const action = button.dataset.myAction, categoryId = button.dataset.categoryId;
    if (action === 'save-name') { const input = document.getElementById('myNameInput'); const name = input.value.trim(); if (!name) { showToast('請輸入名稱'); return; } if (button.dataset.myTarget === 'book') myState.bookName = name; else myState.categories.find(item => item.id === categoryId).name = name; saveMyState(); renderMy(); closeMySheet(); showToast('已儲存'); }
    if (action === 'join-book') { const code = document.getElementById('myJoinCode').value.replace(/\D/g, ''); if (!/^\d{6}$/.test(code)) { showToast('請輸入六碼代碼'); return; } myState.pairCode = code; saveMyState(); renderMy(); closeMySheet(); showToast('已加入共享帳本'); }
    if (action === 'set-appearance') { myState.appearance = button.dataset.appearance; saveMyState(); applyAppearance(); renderMy(); closeMySheet(); }
    if (action === 'toggle-chart') { const item = myState.categories.find(row => row.id === categoryId); item.exclude = !item.exclude; saveMyState(); openCategoriesSheet(); }
    if (action === 'edit-category') openBookNameSheet(categoryId);
    if (action === 'add-category') { const id = 'category-' + Date.now(); const index=myState.categories.length; myState.categories.push({ id, name:'新類別', icon:MY_CATEGORY_ICONS[index % MY_CATEGORY_ICONS.length], color:MY_CATEGORY_COLORS[index % MY_CATEGORY_COLORS.length], exclude:false }); saveMyState(); openBookNameSheet(id); }
    if (action === 'select-icon') { if (button.dataset.myTarget === 'book') myState.bookIcon = button.dataset.iconKey; else myState.categories.find(item => item.id === categoryId).icon = button.dataset.iconKey; saveMyState(); openBookNameSheet(button.dataset.myTarget === 'book' ? undefined : categoryId); }
    if (action === 'select-color') { if (button.dataset.myTarget === 'book') myState.bookColor = button.dataset.color; else myState.categories.find(item => item.id === categoryId).color = button.dataset.color; saveMyState(); openBookNameSheet(button.dataset.myTarget === 'book' ? undefined : categoryId); }
    if (action === 'add-custom-color') { const color = document.getElementById('myCustomColor').value; if (!myState.customColors.includes(color)) myState.customColors.push(color); saveMyState(); openBookNameSheet(button.dataset.myTarget === 'book' ? undefined : categoryId); }
    if (action === 'delete-category') { const item = myState.categories.find(row => row.id === categoryId); closeMySheet(); showConfirmAlert('刪除「' + item.name + '」？既有交易不會被刪除。', () => { myState.categories = myState.categories.filter(row => row.id !== categoryId); saveMyState(); renderMy(); openCategoriesSheet(); }); }
    if (action === 'toggle-tip') { const value = Number(button.dataset.tip); myState.tipPresets = myState.tipPresets.includes(value) ? myState.tipPresets.filter(item => item !== value) : [...myState.tipPresets, value].sort((a,b) => a-b); saveMyState(); renderMy(); openTipsSheet(); }
    if (action === 'add-custom-tip') { const value = Number(document.getElementById('myCustomTip').value); if (!Number.isFinite(value) || value < 0 || value > 100) { showToast('請輸入 0 到 100 的百分比'); return; } if (!myState.tipPresets.includes(value)) myState.tipPresets = [...myState.tipPresets, value].sort((a,b) => a-b); saveMyState(); renderMy(); openTipsSheet(); }
  });
  document.getElementById('myRestoreInput').addEventListener('change', async event => { const file = event.target.files?.[0]; if (!file) return; try { const backup = JSON.parse(await file.text()); if (!backup.settings || !Array.isArray(backup.accounts) || !Array.isArray(backup.transactions)) throw new Error('invalid'); myState = backup.settings; accounts.splice(0, accounts.length, ...backup.accounts); creditTransactions.splice(0, creditTransactions.length, ...backup.transactions); saveMyState(); renderMy(); renderAccountList(); renderOverview(); renderAnalysisSummary(); renderDonut(); renderBills(); renderDebt(); showToast('備份已還原'); } catch { showToast('無法讀取這份備份'); } event.target.value = ''; });
  /* DETAILS_INTEGRATION_START */
  (() => {
    const detailsRoot = document.getElementById('pageList');
    window.renderDetailsPage = () => { detailsRoot.dataset.ready = 'true'; };
  })();
  applyAppearance();
  renderMy();
