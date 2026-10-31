
const COOKIE='__Host-paragon-life-cart';
const API_VERSION='2026-07';
const NO_CACHE={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const ID_PATTERN=/^gid:\/\/shopify\/(ProductVariant|CartLine)\/[^\s]{1,260}$/;
const utf8=new TextEncoder();
const decoder=new TextDecoder();
export function problem(status,message){const err=new Error(message);err.status=status;return err}
export function respond(status,data,extra={}){return new Response(JSON.stringify(data),{status,headers:{...NO_CACHE,...extra,'Content-Type':'application/json; charset=utf-8'}})}
export function fail(err){const code=Number.isInteger(err?.status)?err.status:502;return respond(code,{error:code===503?'The Paragon Life store is not open yet.':code>=500?'The store could not complete your request.':err.message})}
export function method(request,allowed){if(!allowed.includes(request.method))throw problem(405,'Method not allowed.')}
export function origin(request){if(request.headers.get('Origin')!==new URL(request.url).origin)throw problem(403,'Invalid request origin.')}
export async function body(request){const raw=await request.text();if(raw.length>4096)throw problem(413,'Request too large.');try{return JSON.parse(raw)}catch{throw problem(400,'Invalid JSON body.')}}
export function config(env){
 const domain=env.SHOPIFY_STORE_DOMAIN||'',secret=env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN||'';
 const session=env.PARAGON_SESSION_SECRET||'',version=env.SHOPIFY_API_VERSION||API_VERSION;
 if(!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain)||!secret||session.length<32)throw problem(503,'Store is not configured.');
 if(!/^20\d{2}-(01|04|07|10)$/.test(version))throw problem(503,'Store API version is invalid.');
 return {domain,secret,session,version,checkoutDomain:env.SHOPIFY_CHECKOUT_DOMAIN||''};
}
export async function graphql(cfg,query,variables={}){
 let result;try{result=await fetch('https://'+cfg.domain+'/api/'+cfg.version+'/graphql.json',{method:'POST',headers:{'Content-Type':'application/json','Shopify-Storefront-Private-Token':cfg.secret},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(9000)})}catch{throw problem(502,'Store request failed.')}
 if(!result.ok)throw problem(502,'Store request failed.');
 let parsed;try{parsed=await result.json()}catch{throw problem(502,'Invalid store response.')}
 if(parsed.errors?.length||!parsed.data)throw problem(502,'Store request failed.');
 return parsed.data;
}
const CATALOG='query LifeCatalog { products(first:40){nodes{id handle title availableForSale featuredImage{url altText} variants(first:40){nodes{id title availableForSale price{amount currencyCode}}}}}}';
export const CART_FIELDS='id checkoutUrl totalQuantity cost{subtotalAmount{amount currencyCode}} lines(first:100){nodes{id quantity merchandise{... on ProductVariant{id title product{handle title} price{amount currencyCode}}}}}';
export async function catalog(cfg){
 const data=await graphql(cfg,CATALOG);
 return data.products.nodes.map(p=>({handle:p.handle,title:p.title,available:p.availableForSale,image:p.featuredImage?.url||null,imageAlt:p.featuredImage?.altText||p.title,
 variants:p.variants.nodes.map(v=>({id:v.id,title:v.title,available:v.availableForSale,price:Number(v.price.amount),currency:v.price.currencyCode}))}));
}
export async function readCart(cfg,id){
 if(!id)return null;
 const data=await graphql(cfg,'query ReadCart($id:ID!){cart(id:$id){'+CART_FIELDS+'}}',{id});
 return data.cart;
}
export function publicCart(cart){
 if(!cart)return {items:[],subtotal:0,currency:'USD',count:0};
 return {count:cart.totalQuantity,subtotal:Number(cart.cost?.subtotalAmount?.amount||0),currency:cart.cost?.subtotalAmount?.currencyCode||'USD',
 items:cart.lines.nodes.map(x=>({id:x.id,quantity:x.quantity,title:x.merchandise?.product?.title||'Item',variant:x.merchandise?.title||'',price:Number(x.merchandise?.price?.amount||0)}))};
}
function base64url(bytes){let str='';for(const n of bytes)str+=String.fromCharCode(n);return btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'')}
function unbase64url(value){const s=value.replace(/-/g,'+').replace(/_/g,'/');const raw=atob(s.padEnd(Math.ceil(s.length/4)*4,'='));return Uint8Array.from(raw,c=>c.charCodeAt(0))}
async function aesKey(secret){const hashed=await crypto.subtle.digest('SHA-256',utf8.encode(secret));return crypto.subtle.importKey('raw',hashed,'AES-GCM',false,['encrypt','decrypt'])}
export async function encryptCart(id,secret){
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const plaintext=utf8.encode(JSON.stringify({id,exp:Date.now()+604800000}));
 const merged=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,tagLength:128},await aesKey(secret),plaintext));
 return [base64url(iv),base64url(merged.slice(0,-16)),base64url(merged.slice(-16))].join('.');
}
export async function decryptCart(value,secret){
 try{
  if(!value||value.length>3500)return null;
  const bits=value.split('.');if(bits.length!==3)return null;
  const iv=unbase64url(bits[0]),cipher=unbase64url(bits[1]),tag=unbase64url(bits[2]);
  if(iv.length!==12||tag.length!==16)return null;
  const merged=new Uint8Array(cipher.length+tag.length);merged.set(cipher);merged.set(tag,cipher.length);
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv,tagLength:128},await aesKey(secret),merged);
  const data=JSON.parse(decoder.decode(plain));
  return data.exp>Date.now()&&/^gid:\/\/shopify\/Cart\//.test(data.id)?data.id:null;
 }catch{return null}
}
export async function cartId(request,secret){
 const cookie=(request.headers.get('Cookie')||'').split(';').map(p=>p.trim()).find(p=>p.startsWith(COOKIE+'='));
 return decryptCart(cookie?.slice(COOKIE.length+1)||'',secret);
}
export async function cartCookie(id,secret){return COOKIE+'='+await encryptCart(id,secret)+'; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=604800'}
export function validVariant(id){return typeof id==='string'&&ID_PATTERN.test(id)&&id.startsWith('gid://shopify/ProductVariant/')}
export function validLine(id){return typeof id==='string'&&ID_PATTERN.test(id)&&id.startsWith('gid://shopify/CartLine/')}
export function checkoutURL(raw,cfg){
 let url;try{url=new URL(raw)}catch{throw problem(502,'Invalid checkout URL.')}
 if(url.protocol!=='https:'||url.username||url.password||![cfg.domain,cfg.checkoutDomain].filter(Boolean).includes(url.hostname))throw problem(502,'Checkout URL did not pass validation.');
 return url.href;
}
