import {createHash, randomBytes, createCipheriv, createDecipheriv} from 'node:crypto';
export const COOKIE = '__Host-paragon-life-cart';
export const NO_CACHE = {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const API_VERSION = '2026-07';
const ID_PATTERN = /^gid:\/\/shopify\/(ProductVariant|CartLine)\/[^\s]{1,260}$/;
export function respond(res,status,data,additional={}) {
  res.statusCode=status;for(const [k,v] of Object.entries({...NO_CACHE,...additional}))res.setHeader(k,v);
  res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));
}
export function fail(res,error) {
  const status = Number.isInteger(error?.status)?error.status:502;
  return respond(res,status,{error:status===503?'The Paragon Life store is not open yet.':status>=500?'The store could not complete your request.':error.message});
}
export function problem(status,message) {const e=new Error(message);e.status=status;return e;}
export function allowMethod(req,allowed) {
  if(!allowed.includes(req.method))throw problem(405,'Method not allowed.');
}
export function requireOrigin(req) {
  const host=req.headers.host;
  if(!host||req.headers.origin!==('https://'+host))throw problem(403,'Invalid request origin.');
}
export function body(req) {
  const str=typeof req.body==='string'?req.body:JSON.stringify(req.body??{});
  if(str.length>4096)throw problem(413,'Request too large.');
  try{return JSON.parse(str)}catch{throw problem(400,'Invalid JSON body.')}
}
export function storeConfig() {
  const domain=process.env.SHOPIFY_STORE_DOMAIN||'';
  const secret=process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN||'';
  const session=process.env.PARAGON_SESSION_SECRET||'';
  const version=process.env.SHOPIFY_API_VERSION||API_VERSION;
  if(!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain)||!secret||session.length<32)
    throw problem(503,'Shopify is not configured.');
  if(!/^20\d{2}-(01|04|07|10)$/.test(version))throw problem(503,'Store version is invalid.');
  return {domain,secret,session,version};
}
export async function graphql(config,query,variables={}) {
  let response;
  try {
    response=await fetch('https://'+config.domain+'/api/'+config.version+'/graphql.json',{
      method:'POST',headers:{'Content-Type':'application/json','Shopify-Storefront-Private-Token':config.secret},
      body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(9000)
    });
  }catch{throw problem(502,'Store request failed.')}
  if(!response.ok)throw problem(502,'Store request failed.');
  let data;try{data=await response.json()}catch{throw problem(502,'Invalid store response.')}
  if(data.errors?.length||!data.data)throw problem(502,'Store request failed.');
  return data.data;
}
export const CATALOG = `query LifeCatalog { products(first:40){nodes{id handle title availableForSale featuredImage{url altText} variants(first:40){nodes{id title availableForSale price{amount currencyCode}}}}}}`;
export const CART_FIELDS = `id checkoutUrl totalQuantity cost{subtotalAmount{amount currencyCode}} lines(first:100){nodes{id quantity merchandise{... on ProductVariant{id title product{handle title} price{amount currencyCode}}}}}`;
export async function catalog(config) {
 const data=await graphql(config,CATALOG);
 return data.products.nodes.map(p=>({
  handle:p.handle,title:p.title,available:p.availableForSale,
  image:p.featuredImage?.url||null,imageAlt:p.featuredImage?.altText||p.title,
  variants:p.variants.nodes.map(v=>({id:v.id,title:v.title,available:v.availableForSale,price:Number(v.price.amount),currency:v.price.currencyCode}))
 }));
}
export async function readCart(config,id) {
 if(!id)return null;const data=await graphql(config,`query ReadCart($id:ID!){cart(id:$id){${CART_FIELDS}}}`,{id});
 return data.cart;
}
export function publicCart(cart) {
 if(!cart)return {items:[],subtotal:0,currency:'USD',count:0};
 return {count:cart.totalQuantity,subtotal:Number(cart.cost?.subtotalAmount?.amount||0),
 currency:cart.cost?.subtotalAmount?.currencyCode||'USD',items:cart.lines.nodes.map(x=>({
  id:x.id,quantity:x.quantity,title:x.merchandise?.product?.title||'Item',
  variant:x.merchandise?.title||'',price:Number(x.merchandise?.price?.amount||0)
 }))};
}
function aesKey(session){return createHash('sha256').update(session,'utf8').digest();}
export function encryptCart(id,session) {
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',aesKey(session),iv);
 const payload=Buffer.from(JSON.stringify({id,exp:Date.now()+7*86400000}));
 const ciphertext=Buffer.concat([cipher.update(payload),cipher.final()]);
 return [iv,ciphertext,cipher.getAuthTag()].map(x=>x.toString('base64url')).join('.');
}
export function decryptCart(token,session) {
 try{
  if(!token||token.length>3500)return null;
  const parts=token.split('.');if(parts.length!==3)return null;
  const [iv,body,tag]=parts.map(p=>Buffer.from(p,'base64url'));
  if(iv.length!==12||tag.length!==16)return null;
  const decipher=createDecipheriv('aes-256-gcm',aesKey(session),iv);
  decipher.setAuthTag(tag);
  const data=JSON.parse(Buffer.concat([decipher.update(body),decipher.final()]).toString('utf8'));
  return data.exp>Date.now()&&/^gid:\/\/shopify\/Cart\//.test(data.id)?data.id:null;
 }catch{return null}
}
export function cookieFrom(req,session) {
 const all=String(req.headers.cookie||'').split(';').map(x=>x.trim());
 const value=all.find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
 return decryptCart(value,session);
}
export function setCartCookie(res,id,session) {
 res.setHeader('Set-Cookie',COOKIE+'='+encryptCart(id,session)+'; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=604800');
}
export function validVariant(id) {return typeof id==='string'&&ID_PATTERN.test(id)&&id.startsWith('gid://shopify/ProductVariant/');}
export function validLine(id) {return typeof id==='string'&&ID_PATTERN.test(id)&&id.startsWith('gid://shopify/CartLine/');}
export function checkoutURL(raw,config) {
 let url;try{url=new URL(raw)}catch{throw problem(502,'Invalid checkout URL.')}
 const allowed=[config.domain,process.env.SHOPIFY_CHECKOUT_DOMAIN].filter(Boolean);
 if(url.protocol!=='https:'||!allowed.includes(url.hostname)||url.username||url.password)
  throw problem(502,'Checkout URL did not pass validation.');
 return url.href;
}
