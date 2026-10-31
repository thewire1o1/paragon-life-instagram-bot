(() => {
 const root=document.querySelector('.account-shell');if(!root)return;
 const tabs=[...root.querySelectorAll('[data-account-tab]')];
 const panels=new Map(tabs.map(x=>[x.dataset.accountTab,document.getElementById('account-panel-'+x.dataset.accountTab)]));
 function activate(id,focus=false){
  if(!panels.has(id))return;
  for(const tab of tabs){const on=tab.dataset.accountTab===id;tab.setAttribute('aria-selected',String(on));tab.tabIndex=on?0:-1;panels.get(tab.dataset.accountTab).hidden=!on;if(on&&focus)tab.focus()}
 }
 tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>{activate(tab.dataset.accountTab);history.replaceState(null,'','#'+tab.dataset.accountTab)});
 tab.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();let n=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;const id=tabs[n].dataset.accountTab;activate(id,true);history.replaceState(null,'','#'+id)})});
 const id=location.hash.slice(1);if(panels.has(id))activate(id);
 window.addEventListener('hashchange',()=>activate(location.hash.slice(1)));
 const dialog=document.getElementById('account-login-dialog'),open=document.getElementById('account-login-open'),close=document.getElementById('account-login-close');
 let previous=null;
 function show(){previous=document.activeElement;dialog.hidden=false;document.body.style.overflow='hidden';close.focus()}
 function hide(){dialog.hidden=true;document.body.style.overflow='';if(previous?.isConnected)previous.focus()}
 open.addEventListener('click',show);root.querySelectorAll('[data-account-open]').forEach(button=>button.addEventListener('click',show));
 close.addEventListener('click',hide);dialog.addEventListener('click',e=>{if(e.target===dialog)hide()});
 document.addEventListener('keydown',e=>{if(dialog.hidden)return;if(e.key==='Escape'){hide();return}if(e.key==='Tab'){e.preventDefault();close.focus()}});
})();