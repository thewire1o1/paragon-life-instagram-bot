
const m=document.getElementById('menu'),nav=document.getElementById('mobile-nav');
let menuPreviousFocus=null;
function setMenu(open,{restoreFocus=true}={}){
  const wasOpen=!nav.hidden;
  if(open&&!wasOpen)menuPreviousFocus=document.activeElement;
  nav.hidden=!open;
  nav.classList.toggle('open',open);
  m.setAttribute('aria-expanded',String(open));
  m.setAttribute('aria-label',open?'Close menu':'Open menu');
  m.classList.toggle('is-open',open);
  document.body.classList.toggle('menu-open',open);
  if(open){
    nav.style.top=Math.max(0,document.querySelector('.header').getBoundingClientRect().bottom)+'px';
    if(!wasOpen)nav.querySelector('a,summary')?.focus();
  }else{
    nav.querySelectorAll('details').forEach(d=>d.open=false);
    if(wasOpen&&restoreFocus&&menuPreviousFocus?.isConnected)menuPreviousFocus.focus();
  }
}
m.addEventListener('click',()=>setMenu(nav.hidden));
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setMenu(false,{restoreFocus:false})));
document.addEventListener('keydown',event=>{
  if(nav.hidden)return;
  if(event.key==='Escape'){event.preventDefault();setMenu(false);return}
  if(event.key==='Tab'){
    const focusable=[m,...nav.querySelectorAll('a[href],summary')].filter(el=>el.getClientRects().length>0);
    const first=focusable[0],last=focusable[focusable.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
  }
});
window.addEventListener('resize',()=>{if(!nav.hidden){if(window.innerWidth>1100)setMenu(false,{restoreFocus:false});else nav.style.top=Math.max(0,document.querySelector('.header').getBoundingClientRect().bottom)+'px'}});
window.addEventListener('hashchange',()=>{if(!nav.hidden)setMenu(false,{restoreFocus:false})});
(async()=>{const images=[...document.querySelectorAll('[data-image]')];for(const path of new Set(images.map(x=>x.dataset.image))){try{let r=await fetch('/'+path);if(!r.ok)r=await fetch('https://raw.githubusercontent.com/thewire1o1/paragon-life-instagram-bot/site-paragon-life-v2/'+path);if(!r.ok)continue;let b64=(await r.text()).trim();if(/[^A-Za-z0-9+/=\s]/.test(b64)){const fallback=await fetch('https://raw.githubusercontent.com/thewire1o1/paragon-life-instagram-bot/site-paragon-life-v2/'+path);if(!fallback.ok)continue;b64=(await fallback.text()).trim()}if(/[^A-Za-z0-9+/=\s]/.test(b64))continue;const src='data:image/webp;base64,'+b64;images.filter(x=>x.dataset.image===path).forEach(x=>x.src=src)}catch{}}})();

const shopGrid=document.getElementById('catalog-grid');
const liveProducts=document.getElementById('live-products');
const cartOpen=document.getElementById('cart-open');
const cartDrawer=document.getElementById('cart-drawer');
const cartOverlay=document.getElementById('cart-overlay');
const cartClose=document.getElementById('cart-close');
const cartLines=document.getElementById('cart-lines');
const cartCount=document.getElementById('cart-count');
const cartSubtotal=document.getElementById('cart-subtotal');
const cartStatus=document.getElementById('cart-status');
const checkoutButton=document.getElementById('checkout');
let cart={count:0,items:[],subtotal:0,currency:'USD'};
const amount=(n,unit='USD')=>new Intl.NumberFormat('en-US',{style:'currency',currency:unit}).format(n);
async function requestShop(path,method='GET',data){
 const response=await fetch('/api/'+path,{method,credentials:'same-origin',headers:method==='GET'?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});
 let result={};try{result=await response.json()}catch{}
 if(!response.ok)throw new Error(result.error||'Something went wrong.');
 return result;
}
function setCartOpen(open){
 cartDrawer.hidden=!open;cartOverlay.hidden=!open;document.body.classList.toggle('cart-active',open);
 if(open){if(!nav.hidden)setMenu(false,{restoreFocus:false});cartClose.focus()}else cartOpen.focus();
}
function make(tag,text,className){
 const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;
}
function updateCart(){
 cartCount.textContent=cart.count;
 cartSubtotal.textContent=amount(cart.subtotal,cart.currency);
 checkoutButton.disabled=!cart.count;
 cartLines.replaceChildren();
 if(!cart.items.length){cartLines.append(make('p','Your bag is empty.'));const status=make('p','Paragon Merch checkout is coming soon.');status.className='cart-empty-note';cartLines.append(status);return;}
 cart.items.forEach(item=>{
  const box=make('div',undefined,'cart-item');
  const title=make('strong',item.title);
  const variant=make('p',item.variant);
  const qty=make('div',undefined,'quantity');
  const minus=make('button','−');minus.type='button';minus.setAttribute('aria-label','Remove one '+item.title);
  const value=make('span',String(item.quantity));
  const plus=make('button','+');plus.type='button';plus.setAttribute('aria-label','Add one '+item.title);
  minus.addEventListener('click',()=>changeLine(item.id,item.quantity-1));
  plus.addEventListener('click',()=>changeLine(item.id,item.quantity+1));
  qty.append(minus,value,plus);
  const price=make('strong',amount(item.price*item.quantity,cart.currency));
  box.append(title,variant,qty,price);cartLines.append(box);
 });
}
async function changeLine(lineId,quantity){
 try{cartStatus.textContent='Updating bag…';cart=await requestShop('cart','POST',{action:'update',lineId,quantity});updateCart();cartStatus.textContent='';}
 catch(e){cartStatus.textContent=e.message}
}
async function addItem(variantId,quantity,btn){
 btn.disabled=true;const previous=btn.textContent;btn.textContent='Adding…';
 try{cart=await requestShop('cart','POST',{action:'add',variantId,quantity});updateCart();cartStatus.textContent='';setCartOpen(true)}
 catch(e){btn.textContent=e.message;setTimeout(()=>btn.textContent=previous,2200)}
 finally{btn.disabled=false}
}
function renderCatalog(products){
 if(!shopGrid||!liveProducts)return;
 for(const p of products){
  if(!p.available)continue;
  const variants=p.variants.filter(v=>v.available);
  if(!variants.length)continue;
  const item=make('article',undefined,'catalog-item');
  if(p.image&&/^https:\/\/cdn\.shopify\.com\//.test(p.image)){
   const img=document.createElement('img');img.src=p.image;img.alt=p.imageAlt||p.title;img.loading='lazy';item.append(img);
  }
  item.append(make('h4',p.title));
  const select=document.createElement('select');select.setAttribute('aria-label','Choose '+p.title+' option');
  variants.forEach(v=>{const opt=document.createElement('option');opt.value=v.id;opt.textContent=v.title+' · '+amount(v.price,v.currency);select.append(opt)});
  const add=make('button','Add to bag');add.type='button';
  add.addEventListener('click',()=>addItem(select.value,1,add));
  item.append(select,add);shopGrid.append(item);
 }
 if(shopGrid.children.length){liveProducts.hidden=false;const pending=document.getElementById('collection-pending');if(pending)pending.hidden=true}
}
updateCart();
cartOpen.addEventListener('click',()=>setCartOpen(true));
cartClose.addEventListener('click',()=>setCartOpen(false));
cartOverlay.addEventListener('click',()=>setCartOpen(false));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!cartDrawer.hidden)setCartOpen(false)});
checkoutButton.addEventListener('click',async()=>{
 checkoutButton.disabled=true;
 try{const r=await requestShop('checkout','POST',{});window.location.assign(r.url)}
 catch(e){cartStatus.textContent=e.message;checkoutButton.disabled=false}
});
(async()=>{
 try{
  const {products}=await requestShop('catalog');
  if(Array.isArray(products)&&shopGrid&&liveProducts){renderCatalog(products);if(!liveProducts.hidden){cart=await requestShop('cart');updateCart()}}
 }catch{/* Keep commerce hidden until the independent Life store is configured. */}
})();