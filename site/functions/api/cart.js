import {method,origin,body,config,graphql,catalog,readCart,publicCart,cartId,cartCookie,validVariant,validLine,problem,respond,fail,CART_FIELDS} from '../../cloudflare/commerce.js';
function unwrap(result,key){const v=result[key];if(v?.userErrors?.length)throw problem(400,v.userErrors[0].message||'Unable to update cart.');if(!v?.cart)throw problem(502,'The cart could not be updated.');return v.cart}
export async function onRequest({request,env}){
 try{
  method(request,['GET','POST']);const cfg=config(env),id=await cartId(request,cfg.session);
  if(request.method==='GET')return respond(200,publicCart(await readCart(cfg,id)));
  origin(request);const input=await body(request);let updated;
  if(input.action==='add'){
   if(!validVariant(input.variantId)||!Number.isInteger(input.quantity)||input.quantity<1||input.quantity>10)throw problem(400,'Invalid product selection.');
   const products=await catalog(cfg);
   if(!products.some(p=>p.available&&p.variants.some(v=>v.id===input.variantId&&v.available)))throw problem(409,'This product is unavailable.');
   const line={merchandiseId:input.variantId,quantity:input.quantity},existing=await readCart(cfg,id);
   if(existing)updated=unwrap(await graphql(cfg,'mutation Add($id:ID!,$lines:[CartLineInput!]!){cartLinesAdd(cartId:$id,lines:$lines){cart{'+CART_FIELDS+'} userErrors{message}}}',{id,lines:[line]}),'cartLinesAdd');
   else updated=unwrap(await graphql(cfg,'mutation Create($input:CartInput!){cartCreate(input:$input){cart{'+CART_FIELDS+'} userErrors{message}}}',{input:{lines:[line]}}),'cartCreate');
  }else if(input.action==='update'){
   if(!validLine(input.lineId)||!Number.isInteger(input.quantity)||input.quantity<0||input.quantity>10)throw problem(400,'Invalid cart update.');
   const existing=await readCart(cfg,id);
   if(!existing?.lines.nodes.some(l=>l.id===input.lineId))throw problem(404,'Item no longer in cart.');
   if(input.quantity===0)updated=unwrap(await graphql(cfg,'mutation Remove($id:ID!,$lines:[ID!]!){cartLinesRemove(cartId:$id,lineIds:$lines){cart{'+CART_FIELDS+'} userErrors{message}}}',{id,lines:[input.lineId]}),'cartLinesRemove');
   else updated=unwrap(await graphql(cfg,'mutation Update($id:ID!,$lines:[CartLineUpdateInput!]!){cartLinesUpdate(cartId:$id,lines:$lines){cart{'+CART_FIELDS+'} userErrors{message}}}',{id,lines:[{id:input.lineId,quantity:input.quantity}]}),'cartLinesUpdate');
  }else throw problem(400,'Unknown cart action.');
  return respond(200,publicCart(updated),{'Set-Cookie':await cartCookie(updated.id,cfg.session)});
 }catch(e){return fail(e)}
}