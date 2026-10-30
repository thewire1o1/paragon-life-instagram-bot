import {useEffect,useState} from 'react';
export function meta(){return [{title:'Shop | Paragon Life'},{name:'description',content:'Shop Paragon Life apparel and merchandise.'}];}
export default function Shop(){
 const [products,setProducts]=useState([]),[cart,setCart]=useState(null),[busy,setBusy]=useState(''),[notice,setNotice]=useState(''),[mode,setMode]=useState('disabled');
 useEffect(()=>{let canceled=false;fetch('/api/config').then(r=>r.json()).then(x=>{if(!canceled)setMode(x.mode)}).catch(()=>{});fetch('/api/catalog').then(async r=>{if(!r.ok)throw new Error();return r.json()}).then(x=>{if(!canceled)setProducts(x.products||[])}).catch(()=>{});return ()=>{canceled=true}},[]);
 async function post(path,data){const r=await fetch('/api/'+path,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const x=await r.json();if(!r.ok)throw new Error(x.error||'Store is unavailable.');return x}
 async function add(v){setBusy(v.id);try{setCart(await post('cart/add',{variantId:v.id,quantity:1}));setNotice('Added to bag.')}catch(e){setNotice(e.message)}finally{setBusy('')}}
 async function checkout(){setBusy('checkout');try{const x=await post('checkout',{});location.assign(x.url)}catch(e){setNotice(e.message);setBusy('')}}
 return <main id="main" className="page"><span className="eyebrow">THE COLLECTION</span><h1>Shop Paragon Life</h1><p>Apparel and merchandise from the projects and the brand.</p>
 {mode!=='live'&&<p className="launch">The Paragon Life collection is being prepared.</p>}
 {notice&&<p role="status" className="notice">{notice}</p>}
 <div className="product-grid">{products.map(p=><article key={p.handle} className="product"><div className="product-img">{p.image&&<img src={p.image} alt={p.imageAlt||p.title} loading="lazy"/>}</div><h2>{p.title}</h2><div className="variant-buttons">{p.variants.filter(v=>v.available).map(v=><button key={v.id} disabled={busy===v.id} onClick={()=>add(v)}>{v.title}: {new Intl.NumberFormat('en-US',{style:'currency',currency:v.currency}).format(v.price)} · Add</button>)}</div></article>)}</div>
 {cart&&<section className="cart" aria-label="Shopping bag"><h2>Bag ({cart.count})</h2><p>Subtotal {new Intl.NumberFormat('en-US',{style:'currency',currency:cart.currency}).format(cart.subtotal)}</p><button onClick={checkout} disabled={busy==='checkout'||!cart.count}>Checkout ↗</button></section>}
 </main>;
}