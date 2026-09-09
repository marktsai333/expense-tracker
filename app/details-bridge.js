(() => {
  if(!parent.ledger){document.getElementById('content').textContent='請從記帳 App 首頁開啟明細';return;}
  const store=parent.ledger,$=s=>document.querySelector(s);
  let busy=false;
  const run=async(work,after)=>{if(busy)return;busy=true;$('#saveTransaction').disabled=true;try{await work();after?.();}catch(e){toast(e.message);}finally{busy=false;$('#saveTransaction').disabled=false;}};
  window.refreshLedgerDetails=()=>{
    const state=store.snapshot(),payment=$('#newPayment').value;
    transactions=store.transactionsView();
    categoryNames.splice(0,categoryNames.length,...state.categories.filter(c=>!c.archived).map(c=>c.name));
    excludedNames=state.categories.filter(c=>c.exclude).map(c=>c.name);
    for(const c of state.categories){color[c.name]=c.color;paths[c.name]=parent.MY_CATEGORY_ICON_PATHS?.[c.icon]||paths[c.name]||paths.其他;}
    $('#newPayment').innerHTML=state.accounts.map(a=>`<option value="${escapeHTML(a.name)}">${escapeHTML(a.name)}</option>`).join('');
    if(state.accounts.some(a=>a.name===payment))$('#newPayment').value=payment;
    $('#accountValue').textContent=$('#newPayment').value;
    const options=[{name:'全部帳戶',value:'all'},...state.accounts.map(a=>({name:a.name,value:a.name}))];
    document.querySelectorAll('.filter-option').forEach(e=>e.remove());
    const actions=$('.filter-actions');options.forEach(a=>{const b=document.createElement('button');b.className='filter-option';b.dataset.payment=a.value;b.textContent=a.name;b.classList.toggle('active',a.value===pendingPayment);b.onclick=()=>{pendingPayment=a.value;document.querySelectorAll('.filter-option').forEach(x=>x.classList.toggle('active',x===b));};actions.before(b);});
    if(paymentFilter!=='all'&&!state.accounts.some(a=>a.name===paymentFilter))paymentFilter=pendingPayment='all';
    if(categoryFilter&&!state.categories.some(c=>c.name===categoryFilter))categoryFilter=null;
    pinnedSuggestions.clear();state.settings.pinnedSuggestions.forEach(n=>pinnedSuggestions.add(n));hiddenSuggestions.clear();state.settings.hiddenSuggestions.forEach(n=>hiddenSuggestions.add(n));
    render();document.documentElement.dataset.detailsReady='true';
  };
  const originalOpen=openTransaction;
  openTransaction=id=>{
    if(!store.snapshot().accounts.length){toast('請先在帳戶頁新增帳戶');return;}
    originalOpen(id);
    const tx=transactions.find(t=>t.id===id);
    $('#newPayment').value=tx?.payment||store.snapshot().accounts[0].name;
    $('#accountValue').textContent=$('#newPayment').value;
    if(!tx&&!categoryNames.includes(formCategory))formCategory=categoryNames[0]||'';
    $('#deleteTransaction').hidden=!tx;
    tips();renderCategories();renderSuggestions();updateTotal();
  };
  const del=document.createElement('button');del.id='deleteTransaction';del.className='secondary-action';del.style.cssText='width:100%;margin-top:10px;color:var(--danger)';del.textContent='刪除交易';del.hidden=true;$('#saveTransaction').after(del);
  del.onclick=()=>{if(!editingId)return;const id=editingId;parent.showConfirmAlert('確定刪除此筆交易？帳戶餘額會同步更新。',()=>run(()=>store.deleteTransaction(id),()=>{closePanels();toast('交易已刪除');}));};
  $('#saveTransaction').onclick=()=>{
    const state=store.snapshot(),account=state.accounts.find(a=>a.name===$('#newPayment').value),category=state.categories.find(c=>c.name===formCategory);
    const date=$('#newDate').value;
    run(()=>store.saveTransaction({id:editingId||undefined,name:$('#newName').value,subtotal:$('#newAmount').value,type:formType,accountId:account?.id,categoryId:category?.id,date,tipPercent:formTip,items:formItems,note:$('#newNote').value}),()=>{anchorDate=dateFromKey(date);period='month';mode=formType;categoryFilter=null;closePanels();render();document.querySelectorAll('.summary-card').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));toast(editingId?'交易已更新':'交易已新增');});
  };
  // IDs remain stable strings through rows and search; never coerce them to numbers.
  $('#content').addEventListener('click',event=>{const row=event.target.closest('[data-tx-id]');if(row)openTransaction(row.dataset.txId);});
  $('#export').onclick=()=>parent.exportLedgerCSV(selected().map(t=>t.id));
  renderAccounts=()=>{const current=$('#newPayment').value;$('#accountChoices').innerHTML=store.snapshot().accounts.map(a=>`<button class="account-choice ${a.name===current?'active':''}" data-account-choice="${escapeHTML(a.name)}"><span>${escapeHTML(a.name)}</span><span class="check">✓</span></button>`).join('');document.querySelectorAll('[data-account-choice]').forEach(b=>b.onclick=()=>{$('#newPayment').value=b.dataset.accountChoice;$('#accountValue').textContent=b.dataset.accountChoice;closeAccountPicker();});};
  const tips=()=>{const values=[...new Set([0,...store.snapshot().settings.tipPresets,formTip])];$('#tipChips').innerHTML=values.map(n=>`<button class="${n===formTip?'active':''}" data-tip="${n}">${n===0?'無':n+'%'}</button>`).join('');document.querySelectorAll('#tipChips [data-tip]').forEach(b=>b.onclick=()=>{formTip=Number(b.dataset.tip);tips();updateTotal();});};
  const custom=document.createElement('input');custom.id='customTransactionTip';custom.type='number';custom.inputMode='decimal';custom.min='0';custom.max='100';custom.step='.1';custom.placeholder='自訂服務費 %';custom.setAttribute('aria-label','自訂服務費比例');$('#tipChips').after(custom);custom.oninput=()=>{formTip=Number(custom.value||0);updateTotal();};
  const allocation=document.createElement('div');allocation.id='itemAllocation';allocation.className='total-preview';$('#itemList').after(allocation);
  const oldTotal=updateTotal;
  updateTotal=()=>{oldTotal();const subtotal=Number($('#newAmount').value)||0,allocated=formItems.reduce((n,i)=>n+(Number(i.amount)||0),0);allocation.textContent=`細項已分配 ${money(allocated)}・未分配 ${money(Math.round((subtotal-allocated)*100)/100)}`;};
  $('#itemList').addEventListener('input',updateTotal);$('#itemList').addEventListener('click',()=>queueMicrotask(updateTotal));$('#addItem').addEventListener('click',()=>queueMicrotask(updateTotal));
  const oldItems=renderItems;renderItems=()=>{oldItems();updateTotal();};
  // Pin/hide edits are persisted as settings, and selection keeps today's date/note.
  document.addEventListener('click',event=>{const pin=event.target.closest('[data-pin-suggestion]'),hide=event.target.closest('[data-hide-suggestion]');if(pin||hide){event.preventDefault();event.stopImmediatePropagation();const next=store.settingsView();if(pin){const key=pin.dataset.pinSuggestion;next.pinnedSuggestions=next.pinnedSuggestions.includes(key)?next.pinnedSuggestions.filter(k=>k!==key):[...next.pinnedSuggestions,key];}else next.hiddenSuggestions=[...new Set([...next.hiddenSuggestions,hide.dataset.hideSuggestion])];run(()=>store.saveSettings(next),renderSuggestions);}
    const suggestion=event.target.closest('[data-suggestion]');if(suggestion)queueMicrotask(()=>{$('#accountValue').textContent=$('#newPayment').value;tips();updateTotal();});
  },true);
  // Category form is the same approved grid; income has its own neutral label.
  const oldCategories=renderCategories;renderCategories=()=>{if(formType==='income'){$('#categoryGrid').innerHTML='<p class="field-label">收入</p>';return;}oldCategories();};
  document.querySelectorAll('[data-type]').forEach(b=>b.addEventListener('click',()=>{renderCategories();}));
  window.refreshLedgerDetails();
})();
