/* Bind the approved presentation to the single committed ledger. */
(() => {
  const store=window.ledger, utils=window.ledgerUtils;
  window.MY_CATEGORY_ICON_PATHS=MY_CATEGORY_ICON_PATHS;
  let busy=false;
  const run=async(work,after)=>{if(busy)return;busy=true;document.documentElement.dataset.saving='true';try{await work();after?.();}catch(error){window.refreshLedgerUI();showToast(error.message);}finally{busy=false;delete document.documentElement.dataset.saving;}};
  window.runLedgerAction=run;
  const cloudStatusLabel={disabled:'本機帳本',idle:'尚未連線',connecting:'連線中',syncing:'同步中',synced:'已同步',offline:'離線',error:'同步錯誤'};
  const renderCloudStatus=view=>{
    const state=view||window.cloudSync?.view()||{status:'disabled',message:'尚未設定 Firebase'};
    const status=cloudStatusLabel[state.status]||'本機帳本';
    const hint=document.querySelector('.my-pair-hint');
    if(hint) hint.textContent=state.status==='disabled'?'目前只儲存在此裝置；設定 Firebase 後即可啟用雙人同步。':state.status==='idle'?'代碼尚未連線；按下加入共享帳本開始同步。':(state.message||status);
    const syncTitle=state.status==='synced'?'立即同步共享帳本':state.status==='disabled'?'資料儲存在這部裝置':'共享帳本同步狀態：'+status;
    document.getElementById('syncBtn')?.setAttribute('title',syncTitle);
    document.querySelectorAll('.sync-pill').forEach(e=>e.textContent=status);
    const sub=document.querySelector('.date-sub');if(sub)sub.textContent=state.status==='synced'?'資料已同步至共享帳本':'資料已儲存於此裝置';
  };
  window.refreshLedgerUI=()=>{
    const state=store.snapshot();
    accounts.splice(0,accounts.length,...store.accountsView());
    // Credit spent is debt, not a mutable counter. Cash spent is a projection.
    accounts.forEach(a=>{if(a.paymentType==='credit')a.spent=-utils.balanceCents(state,a.id)/100;});
    const transactions=store.transactionsView();
    creditTransactions.splice(0,creditTransactions.length,...transactions.map(t=>({...t,iso:t.date,month:t.date.slice(0,7).replace('-','年')+'月',amount:t.type==='expense'?t.amount:-t.amount})).sort((a,b)=>b.iso.localeCompare(a.iso)));
    paymentLog.splice(0,paymentLog.length,...state.transactions.filter(t=>t.type==='payment').map(t=>({creditId:t.toAccountId,accountId:t.accountId,amount:t.amountCents/100})));
    myState=store.settingsView();
    const now=new Date(),month=utils.dayKey(now).slice(0,7),monthly=transactions.filter(t=>t.date.startsWith(month));
    CATS=state.categories.map(c=>({...c}));CATS.push({id:'income',name:'收入',color:'#22a854'});
    expenseByCat={};incomeByCat={};
    monthly.forEach(t=>{const target=t.type==='income'?incomeByCat:expenseByCat;const id=t.categoryId||'income';target[id]=(target[id]||0)+t.amount;});
    expenseTotal=monthly.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
    incomeTotal=monthly.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);balanceTotal=incomeTotal-expenseTotal;
    trendMonths=[];trendExpense=[];trendIncome=[];
    for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);const key=utils.dayKey(d).slice(0,7);trendMonths.push(`${d.getMonth()+1}月`);const tx=transactions.filter(t=>t.date.startsWith(key));trendExpense.push(tx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0));trendIncome.push(tx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0));}
    trendBalance=trendIncome.map((v,i)=>v-trendExpense[i]);
    renderAccountList();renderSettingsList();renderOverview();renderMy();renderAnalysisSummary();renderDonut();renderTrend();renderBills();renderDebt();
    if(currentDetailId&&accounts.some(a=>a.id===currentDetailId))renderDetail();
    else if(currentDetailId){currentDetailId=null;showScreen('list');}
    applyAppearance();
    const net=myState.overviewMode==='net';ovVariantA.style.display=net?'':'none';ovVariantB.style.display=net?'none':'';
    const modeLabel=document.getElementById('myOverviewModeValue');if(modeLabel)modeLabel.textContent=net?'淨資產模式':'信用卡模式';
    document.getElementById('ovDateBig').textContent=`${now.getMonth()+1}月${now.getDate()}日(${'日一二三四五六'[now.getDay()]})`;
    renderCloudStatus(window.cloudSync?.view());
    const excluded=state.categories.filter(c=>c.exclude).map(c=>c.name).join('、');
    let note=document.getElementById('chartExclusions');if(!note){note=document.createElement('p');note.id='chartExclusions';note.className='my-sheet-note';document.getElementById('donutArea').after(note);}note.textContent=excluded?'消費結構已排除：'+excluded:'';
    document.getElementById('phoneBuildVersion')?.replaceChildren(document.createTextNode('本機帳本 v1 · 手機版面 v10'));
    document.getElementById('detailsApprovedFrame')?.contentWindow?.refreshLedgerDetails?.();
  };
  statementSplit=credit=>utils.statement(store.snapshot(),credit.id);
  cashBalance=a=>utils.balanceCents(store.snapshot(),a.id)/100;
  creditBalance=a=>utils.balanceCents(store.snapshot(),a.id)/100;
  creditAvailable=a=>a.limit+creditBalance(a);
  buildDonutData=()=>{const isIncome=ieSeg.getIndex()===0,src=isIncome?incomeByCat:expenseByCat;const slices=CATS.filter(c=>isIncome||!c.exclude).map(c=>({id:c.id,name:c.name,color:c.color,amount:src[c.id]||0})).filter(s=>s.amount>0).sort((a,b)=>b.amount-a.amount);return {slices,total:slices.reduce((s,c)=>s+c.amount,0)};};
  // These global functions are called by the preserved desktop and phone gestures.
  saveMyState=()=>run(()=>store.saveSettings(myState));
  deleteAccount=(id,onDeleted)=>{const a=accounts.find(a=>a.id===id);if(!a)return;showConfirmAlert(`確定刪除「${a.name}」？`,()=>run(()=>store.deleteAccount(id),()=>{onDeleted?.();showToast('帳戶已刪除');}));};
  exportBackup=()=>downloadFile('expense-tracker-backup.json','application/json',store.backup());
  exportCsv=()=>downloadFile('expense-tracker.csv','text/csv;charset=utf-8',utils.exportCSV(store.snapshot()));
  window.exportLedgerCSV=ids=>downloadFile('expense-tracker.csv','text/csv;charset=utf-8',utils.exportCSV(store.snapshot(),ids));
  const originalCategories=openCategoriesSheet;
  openCategoriesSheet=()=>{originalCategories();document.querySelectorAll('.my-category-row').forEach((row,index)=>{const move=document.createElement('button');move.className='my-add-inline';move.textContent='↑';move.setAttribute('aria-label','上移'+myState.categories[index].name);move.disabled=index===0;move.onclick=()=>{const next=store.settingsView();[next.categories[index-1],next.categories[index]]=[next.categories[index],next.categories[index-1]];run(()=>store.saveSettings(next),openCategoriesSheet);};row.prepend(move);});};
  const myImport=document.createElement('button');myImport.className='my-row';myImport.id='myImportCsv';myImport.innerHTML='<span class="my-row-icon">'+myIcons.upload+'</span><span class="my-row-label">匯入 CSV</span><span class="my-row-chevron">›</span>';document.getElementById('myExportCsv').after(myImport);
  const csvInput=document.createElement('input');csvInput.type='file';csvInput.accept='.csv,text/csv';csvInput.hidden=true;csvInput.id='csvImportInput';document.body.append(csvInput);myImport.onclick=()=>csvInput.click();
  csvInput.onchange=async()=>{const file=csvInput.files?.[0];csvInput.value='';if(!file)return;if(file.size>20e6)return showToast('檔案超過 20 MB');const text=await file.text();showConfirmAlert('匯入這份 CSV？相同交易會略過，現有交易會保留。',()=>run(()=>utils.importCSV(store,text),()=>showToast('CSV 已匯入')));};
  const excelImport=document.createElement('button');excelImport.className='my-row';excelImport.id='myImportExcel';excelImport.innerHTML='<span class="my-row-icon">'+myIcons.upload+'</span><span class="my-row-label">匯入 Excel</span><span class="my-row-chevron">›</span>';myImport.after(excelImport);
  const excelInput=document.createElement('input');excelInput.type='file';excelInput.accept='.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';excelInput.hidden=true;excelInput.id='xlsxImportInput';document.body.append(excelInput);excelImport.onclick=()=>excelInput.click();
  excelInput.onchange=async()=>{const file=excelInput.files?.[0];excelInput.value='';if(!file)return;if(file.size>20e6)return showToast('檔案超過 20 MB');try{const buffer=await file.arrayBuffer(),preview=utils.convertXLSX(buffer),hint=preview.warnings.length?`\n另有 ${preview.warnings.length} 項資料提示。`:'';showConfirmAlert(`將用 Excel 的 ${preview.importedCount} 筆交易取代目前全部帳戶與交易？${hint}`,()=>run(()=>utils.importXLSX(store,buffer),()=>showToast(`Excel 已匯入 ${preview.importedCount} 筆`)));}catch(error){showToast(error.message||'無法讀取這份 Excel');}};
  const cloudCodeLabel=code=>String(code||'').replace(/^(\d{3})(\d{3})$/,'$1 $2');
  const htmlEscape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const backupReasonLabel={daily:'每日備份','before-clear':'清除前備份','before-restore':'還原前備份',manual:'手動備份'};
  const formatBackupDate=value=>{const date=value?.toDate?value.toDate():new Date(value||0);return Number.isNaN(date.getTime())?'剛剛':date.toLocaleString('zh-TW',{year:'numeric',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});};
  const openCloudSheet=()=>{
    const state=window.cloudSync?.view()||{status:'disabled'};
    if(state.status==='disabled'){
      return window.openMySheet?.('雲端同步','<p class="my-sheet-note">目前只儲存在此裝置。完成 Firebase Web 設定並重新部署後，就能用六碼代碼與另一支手機同步。</p><div class="my-sheet-actions"><button class="my-sheet-action" data-my-action="close-cloud">知道了</button></div>');
    }
    const code=store.snapshot().settings.pairCode;
    window.openMySheet?.('雲端同步',`<p class="my-sheet-note">兩支手機使用同一組六碼代碼，就會同步帳戶、交易、類別與帳本設定。${state.status==='synced'?'目前已連線，可直接按立即同步。':''}</p><div class="field-label" style="margin-top:0">目前代碼</div><div class="my-cloud-current-code">${cloudCodeLabel(code)}</div><button class="my-sheet-action" data-my-action="cloud-create">使用目前代碼開始共享</button><div class="field-label">加入另一個帳本</div><input class="field-input" id="myJoinCode" inputmode="numeric" maxlength="7" placeholder="例如 123 456" /><div class="my-sheet-actions"><button class="my-sheet-action" data-my-action="cloud-join">加入並同步</button></div>`);
  };
  const openCloudBackupsSheet=async()=>{
    const cloud=window.cloudSync;
    if(!cloud?.activeCode)return window.openMySheet?.('雲端備份','<p class="my-sheet-note">請先在「加入共享帳本」啟用雲端同步，才能建立與還原雲端備份。</p><div class="my-sheet-actions"><button class="my-sheet-action" data-my-action="close-cloud">知道了</button></div>');
    window.openMySheet?.('雲端備份','<p class="my-sheet-note">每天第一次連線會自動保存一份完整帳本；清除或還原前也會先保存。備份包含帳戶、交易、分類、帳本圖案、顏色與所有設定。</p><p class="my-sheet-note">讀取備份清單中…</p>');
    try{
      const backups=await cloud.listBackups();
      const rows=backups.length?backups.map(item=>`<button class="my-setting-option my-cloud-backup-row" data-my-action="cloud-restore-backup" data-backup-id="${htmlEscape(item.id)}"><span><strong>${htmlEscape(formatBackupDate(item.createdAt))}</strong><small>${htmlEscape(backupReasonLabel[item.reason]||'雲端備份')} · ${item.accountCount} 個帳戶 · ${item.transactionCount} 筆交易</small></span><span class="check">還原</span></button>`).join(''):'<p class="my-sheet-note">目前還沒有雲端備份。</p>';
      window.openMySheet?.('雲端備份',`<p class="my-sheet-note">每天第一次連線會自動保存一份完整帳本；清除或還原前也會先保存。備份包含帳戶、交易、分類、帳本圖案、顏色與所有設定。</p><button class="my-sheet-action" data-my-action="cloud-backup-now">立即備份</button><div class="my-cloud-backup-list">${rows}</div>`);
    }catch(error){
      window.openMySheet?.('雲端備份',`<p class="my-sheet-note">目前無法讀取雲端備份：${htmlEscape(error.message||'同步失敗')}</p><div class="my-sheet-actions"><button class="my-sheet-action" data-my-action="close-cloud">知道了</button></div>`);
    }
  };
  // Capture before the approved demo's in-memory listeners. Nothing is mutated
  // until the transaction commits; errors leave forms and data available.
  document.addEventListener('click',event=>{
    const target=event.target.closest('button,[data-phone-overview-mode],[data-my-action]');if(!target)return;
    const id=target.id,action=target.dataset.myAction,mode=target.dataset.phoneOverviewMode;
    const intercept=()=>{event.preventDefault();event.stopImmediatePropagation();};
    if(['saveAccountBtn','saveEditAccountBtn','confirmPayBtn','editPrimaryToggle','myBackup','myExportCsv','myClear','myJoinBook','myCloudBackups','syncBtn','ovSyncBtn'].includes(id)||mode||['save-name','join-book','set-appearance','toggle-chart','add-category','select-icon','select-color','add-custom-color','delete-category','toggle-tip','add-custom-tip','cloud-create','cloud-join','cloud-backup-now','cloud-restore-backup','close-cloud'].includes(action))intercept();else return;
    if(id==='myBackup')return exportBackup();if(id==='myExportCsv')return exportCsv();
    if(id==='myJoinBook')return openCloudSheet();
    if(id==='myCloudBackups')return openCloudBackupsSheet();
    if(id==='syncBtn'||id==='ovSyncBtn'){if(window.cloudSync?.activeCode)return window.cloudSync.syncNow();return openCloudSheet();}
    if(action==='close-cloud')return closeMySheet();
    if(action==='cloud-create')return run(()=>window.cloudSync.start(store.snapshot().settings.pairCode,{mode:'create'}),()=>{closeMySheet();showToast('共享帳本已啟用');});
    if(action==='cloud-join'){const code=document.getElementById('myJoinCode')?.value.replace(/\D/g,'');if(!/^\d{6}$/.test(code))return showToast('請輸入六碼配對代碼');return run(()=>window.cloudSync.start(code,{mode:'join'}),()=>{closeMySheet();showToast('已加入共享帳本');});}
    if(action==='cloud-backup-now')return run(()=>window.cloudSync.createBackup('manual'),()=>{showToast('雲端備份已建立');openCloudBackupsSheet();});
    if(action==='cloud-restore-backup'){const id=target.dataset.backupId;return showConfirmAlert('先保存目前資料，再還原這份雲端備份？',()=>run(()=>window.cloudSync.restoreBackup(id),()=>{closeMySheet();showToast('雲端備份已還原');}));}
    if(action==='join-book')return openCloudSheet();
    if(id==='myClear')return showConfirmAlert('清除全部帳戶、交易與設定？此動作無法復原，會先保存一份雲端備份。',()=>run(async()=>{if(window.cloudSync?.activeCode)await window.cloudSync.createBackup('before-clear');await store.clear();},()=>{closeMySheet();showToast('所有資料已清除');}));
    if(id==='saveAccountBtn'){
      const paymentType=currentAddType(),linkedAccountId=document.getElementById('linkedAccountSelect').dataset.value||null,linked=accounts.find(a=>a.id===linkedAccountId),bankId=paymentType==='bank'?document.getElementById('bankSelect').dataset.value:paymentType==='credit'?linked?.bankId:null;
      const name=document.getElementById('newAccName').value.trim()||suggestedAccName(paymentType,bankId);
      return run(()=>store.saveAccount({name,paymentType,linkedAccountId:paymentType==='credit'?linkedAccountId:null,bankId,startingBalance:document.getElementById('newAccBalance').value||0,limit:document.getElementById('newCreditLimit').value||0,closingDay:document.getElementById('newClosingDay').value||1,methods:paymentType==='bank'?addMethods:[]}),()=>finishAddAccount(name));
    }
    if(id==='saveEditAccountBtn'){
      const a=accounts.find(a=>a.id===editingAccountId);if(!a)return;
      const linkedAccountId=document.getElementById('editLinkedAccountSelect').dataset.value||null;
      return run(()=>store.saveAccount({...a,name:document.getElementById('editAccName').value,limit:a.paymentType==='credit'?document.getElementById('editCreditLimit').value:0,closingDay:a.paymentType==='credit'?document.getElementById('editClosingDay').value:1,linkedAccountId:a.paymentType==='credit'?linkedAccountId:null,bankId:a.paymentType==='credit'?accounts.find(a=>a.id===linkedAccountId)?.bankId:a.bankId,currentBalance:a.paymentType!=='credit'?document.getElementById('editAccBalance').value:undefined,methods:a.paymentType==='bank'?editingMethods:[]}),()=>{closeEditSheet();showToast('帳戶已更新');});
    }
    if(id==='confirmPayBtn')return run(()=>store.pay(currentDetailId,selectedPayAccountId),()=>{closePaySheet();showToast('信用卡已繳款');});
    if(id==='editPrimaryToggle')return run(()=>store.commit(s=>s.accounts.forEach(a=>a.primaryOverview=a.id===editingAccountId)),()=>{const a=accounts.find(a=>a.id===editingAccountId);openEditSheet(a);});
    let next=store.settingsView();const categoryId=target.dataset.categoryId,item=next.categories.find(c=>c.id===categoryId);const book=target.dataset.myTarget==='book';let after=()=>{closeMySheet();showToast('已儲存');};
    if(mode)next.overviewMode=mode;
    if(action==='save-name'){const name=document.getElementById('myNameInput').value.trim();if(!name)return showToast('請輸入名稱');if(book)next.bookName=name;else item.name=name;}
    if(action==='set-appearance')next.appearance=target.dataset.appearance;
    if(action==='toggle-chart'){item.exclude=!item.exclude;after=openCategoriesSheet;}
    if(action==='add-category'){const c={id:crypto.randomUUID(),name:'新類別',icon:'more',color:MY_CATEGORY_COLORS[next.categories.length%MY_CATEGORY_COLORS.length],exclude:false};let n=2;while(next.categories.some(x=>x.name===c.name))c.name='新類別 '+n++;next.categories.push(c);after=()=>openBookNameSheet(c.id);}
    if(action==='select-icon'){if(book)next.bookIcon=target.dataset.iconKey;else item.icon=target.dataset.iconKey;after=()=>openBookNameSheet(book?undefined:categoryId);}
    if(action==='select-color'){if(book)next.bookColor=target.dataset.color;else item.color=target.dataset.color;after=()=>openBookNameSheet(book?undefined:categoryId);}
    if(action==='add-custom-color'){const color=document.getElementById('myCustomColor').value;if(!next.customColors.includes(color))next.customColors.push(color);after=()=>openBookNameSheet(book?undefined:categoryId);}
    if(action==='delete-category')return showConfirmAlert('刪除此類別？歷史交易與統計仍會保留。',()=>{next.categories=next.categories.filter(c=>c.id!==categoryId);run(()=>store.saveSettings(next),openCategoriesSheet);});
    if(action==='toggle-tip'){const value=Number(target.dataset.tip);next.tipPresets=next.tipPresets.includes(value)?next.tipPresets.filter(v=>v!==value):[...next.tipPresets,value].sort((a,b)=>a-b);after=openTipsSheet;}
    if(action==='add-custom-tip'){const raw=document.getElementById('myCustomTip').value;if(raw==='')return showToast('請輸入百分比');const value=Number(raw);next.tipPresets=[...new Set([...next.tipPresets,value])].sort((a,b)=>a-b);after=openTipsSheet;}
    run(()=>store.saveSettings(next),after);
  },true);
  document.getElementById('myRestoreInput').addEventListener('change',async event=>{event.stopImmediatePropagation();const file=event.target.files?.[0];event.target.value='';if(!file)return;if(file.size>20e6)return showToast('檔案超過 20 MB');const text=await file.text();try{const parsed=JSON.parse(text);if(parsed.format!=='expense-tracker')throw Error();}catch{return showToast('無法讀取這份正式版備份');}showConfirmAlert('以此備份取代目前全部帳戶、交易與設定？會先保存目前的雲端資料。',()=>run(async()=>{if(window.cloudSync?.activeCode)await window.cloudSync.createBackup('before-restore');const code=window.cloudSync?.activeCode;await store.restore(text);if(code)await store.saveSettings({...store.settingsView(),pairCode:code,cloudEnabled:true});},()=>{closeMySheet();showToast('備份已還原');}));},true);
  store.subscribe(window.refreshLedgerUI);
  window.cloudSync?.subscribe(renderCloudStatus);
  window.refreshLedgerUI();
})();
