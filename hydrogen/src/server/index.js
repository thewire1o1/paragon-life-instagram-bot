// Paragon Life dedicated Shopify Storefront API. No Coffee credentials or shared checkout.
const noStore={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{...noStore,...extra}});
const live=env=>env.PARAGON_COMMERCE_MODE==='live';
const cookieName='__Host-paragon-life-cart';
function config(env) {const domain=env.SHOPIFY_STORE_DOMAIN||'',secret=env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN||'',session=String(env.PARAGON_SESSION_SECRET||'');
if(!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain)||!secret||session.length<32)throw new Error('Store not configured');
const api=env.SHOPIFY_API_VERSION||'2026-07';if(!/^20\d{2}-(01|04|07|10)$/.test(api))throw new Error('Invalid API version');return {domain,secret,session,api};}
async function graph(c,query,variables={}){const r=await fetch('https://'+c.domain+'/api/'+c.api+'/graphql.json',{method:'POST',headers:{'Content-Type':'application/json','Shopify-Storefront-Private-Token':c.secret},body:JSON.stringify({query,variables})});if(!r.ok)throw Error('Store request failed');const x=await r.json();if(x.errors?.length)throw Error('Store request failed');return x.data;}
const productQuery='query LifeProducts {products(first:80){nodes{handle title availableForSale featuredImage{url altText} variants(first:100){nodes{id title availableForSale price{amount currencyCode}}}}}}';
const cartFields='id checkoutUrl totalQuantity cost{subtotalAmount{amount currencyCode}} lines(first:100){nodes{id quantity merchandise{... on ProductVariant{id title price{amount currencyCode} product{title handle}}}}}';
async function products(c){const x=await graph(c,productQuery);return x.products.nodes.map(p=>({handle:p.handle,title:p.title,available:p.availableForSale,image:p.featuredImage?.url||null,imageAlt:p.featuredImage?.altText||p.title,variants:p.variants.nodes.map(v=>({id:v.id,title:v.title,available:v.availableForSale,price:Number(v.price.amount),currency:v.price.currencyCode}))}));}
const utf=new TextEncoder(),dec=new TextDecoder();
async function key(c){const h=await crypto.subtle.digest('SHA-256',utf.encode(c.session));return crypto.subtle.importKey('raw',h,{name:'AES-GCM'},false,['encrypt','decrypt']);}
const b64=b=>btoa(String.fromCharCode(...b)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const unb64=s=>Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),x=>x.charCodeAt(0));
export async function seal(id,c){const iv=crypto.getRandomValues(new Uint8Array(12));const b=await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(c),utf.encode(JSON.stringify({id,expire:Date.now()+604800000})));return b64(iv)+'.'+b64(new Uint8Array(b));}
export async function unseal(token,c){try{if(!token||token.length>5000)return null;const [iv,b]=token.split('.');if(!iv||!b)return null;const value=JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(iv)},await key(c),unb64(b))));return value.expire>Date.now()&&value.id?.startsWith('gid://shopify/Cart/')?value.id:null;}catch{return null;}}
async function cartId(req,c){const raw=req.headers.get('Cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.split('=')[1];return unseal(raw,c);}
async function getCart(req,c,id){if(!id)return null;return (await graph(c,'query Cart($id:ID!){cart(id:$id){'+cartFields+'}}',{id})).cart;}
function publicCart(c){return c?{count:c.totalQuantity,subtotal:Number(c.cost.subtotalAmount.amount),currency:c.cost.subtotalAmount.currencyCode,items:c.lines.nodes.map(l=>({id:l.id,quantity:l.quantity,title:l.merchandise.product.title,variant:l.merchandise.title,price:Number(l.merchandise.price.amount)}))}:{count:0,subtotal:0,currency:'USD',items:[]};}
async function body(req){const t=await req.text();if(t.length>8192)throw Error('Request too large');return JSON.parse(t);}
function result(data,name){const x=data[name];if(x.userErrors?.length||!x.cart)throw Error('Cart update failed');return x.cart;}
function safeCheckout(url,c,env){let u;try{u=new URL(url)}catch{throw Error('Invalid checkout')};const hosts=[c.domain,env.SHOPIFY_CHECKOUT_DOMAIN].filter(Boolean);if(u.protocol!=='https:'||!hosts.includes(u.hostname))throw Error('Invalid checkout');return u.href;}
export async function handleAPI(req,env={},url=new URL(req.url)){const path=url.pathname.slice(5);
if(req.method!=='GET'&&req.method!=='POST')return json({error:'Method not allowed'},405);
if(req.method==='POST'&&req.headers.get('Origin')!==url.origin)return json({error:'Invalid request origin'},403);
if(path==='config'&&req.method==='GET')return json({mode:live(env)?'live':'disabled',checkoutEnabled:live(env)&&env.PARAGON_CHECKOUT_ENABLED==='true'});
if(!live(env))return json({error:'The Paragon Life store is not open yet.'},503);
try{const c=config(env);
 if(path==='catalog'&&req.method==='GET')return json({products:await products(c)});
 const id=await cartId(req,c);
 if(path==='cart'&&req.method==='GET')return json(publicCart(await getCart(req,c,id)));
 if(path==='checkout'&&req.method==='POST'){if(env.PARAGON_CHECKOUT_ENABLED!=='true')return json({error:'Checkout is not open.'},503);const cart=await getCart(req,c,id);if(!cart?.totalQuantity)return json({error:'Your bag is empty.'},409);return json({url:safeCheckout(cart.checkoutUrl,c,env)});}
 if(path==='cart/add'&&req.method==='POST'){const b=await body(req);
 if(!Number.isInteger(b.quantity)||b.quantity<1||b.quantity>20||!/^gid:\/\/shopify\/ProductVariant\/[A-Za-z0-9]+$/.test(b.variantId||''))return json({error:'Invalid variant or quantity'},400);
 const all=await products(c);if(!all.some(p=>p.available&&p.variants.some(v=>v.available&&v.id===b.variantId)))return json({error:'Product unavailable'},409);
 const line={merchandiseId:b.variantId,quantity:b.quantity};const current=await getCart(req,c,id);let out;
 if(current)out=result(await graph(c,'mutation Add($id:ID!,$lines:[CartLineInput!]!){cartLinesAdd(cartId:$id,lines:$lines){cart{'+cartFields+'} userErrors{message}}}',{id,lines:[line]}),'cartLinesAdd');
 else out=result(await graph(c,'mutation Create($input:CartInput!){cartCreate(input:$input){cart{'+cartFields+'} userErrors{message}}}',{input:{lines:[line]}}),'cartCreate');
 return json(publicCart(out),200,{'Set-Cookie':cookieName+'='+await seal(out.id,c)+'; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=604800'});}
 return json({error:'Not found'},404);
}catch(e){return json({error:'The store could not complete the request.'},502);}
}