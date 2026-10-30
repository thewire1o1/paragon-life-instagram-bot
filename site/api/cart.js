import {allowMethod,requireOrigin,body,storeConfig,graphql,catalog,readCart,publicCart,cookieFrom,setCartCookie,validVariant,validLine,problem,respond,fail,CART_FIELDS} from './_commerce.mjs';
function unwrap(result,key) {
 const v=result[key];if(v?.userErrors?.length)throw problem(400,v.userErrors[0].message||'Unable to update cart.');
 if(!v?.cart)throw problem(502,'The cart could not be updated.');
 return v.cart;
}
export default async function handler(req,res){
 try{
  allowMethod(req,['GET','POST']);const config=storeConfig(),id=cookieFrom(req,config.session);
  if(req.method==='GET')return respond(res,200,publicCart(await readCart(config,id)));
  requireOrigin(req);
  const input=body(req);
  let next;
  if(input.action==='add'){
   if(!validVariant(input.variantId)||!Number.isInteger(input.quantity)||input.quantity<1||input.quantity>10)
    throw problem(400,'Invalid product selection.');
   const products=await catalog(config);
   if(!products.some(p=>p.available&&p.variants.some(v=>v.id===input.variantId&&v.available)))
    throw problem(409,'This product is unavailable.');
   const line={merchandiseId:input.variantId,quantity:input.quantity};
   const existing=await readCart(config,id);
   if(existing){
    next=unwrap(await graphql(config,\`mutation Add($id:ID!,$lines:[CartLineInput!]!){cartLinesAdd(cartId:$id,lines:$lines){cart{\${CART_FIELDS}} userErrors{message}}}\`,{id,lines:[line]}),'cartLinesAdd');
   }else{
    next=unwrap(await graphql(config,\`mutation Create($input:CartInput!){cartCreate(input:$input){cart{\${CART_FIELDS}} userErrors{message}}}\`,{input:{lines:[line]}}),'cartCreate');
   }
  }else if(input.action==='update'){
   if(!validLine(input.lineId)||!Number.isInteger(input.quantity)||input.quantity<0||input.quantity>10)
    throw problem(400,'Invalid cart update.');
   const existing=await readCart(config,id);
   if(!existing?.lines.nodes.some(l=>l.id===input.lineId))throw problem(404,'Item no longer in cart.');
   if(input.quantity===0){
    next=unwrap(await graphql(config,\`mutation Remove($id:ID!,$lines:[ID!]!){cartLinesRemove(cartId:$id,lineIds:$lines){cart{\${CART_FIELDS}} userErrors{message}}}\`,{id,lines:[input.lineId]}),'cartLinesRemove');
   }else{
    next=unwrap(await graphql(config,\`mutation Update($id:ID!,$lines:[CartLineUpdateInput!]!){cartLinesUpdate(cartId:$id,lines:$lines){cart{\${CART_FIELDS}} userErrors{message}}}\`,{id,lines:[{id:input.lineId,quantity:input.quantity}]}),'cartLinesUpdate');
   }
  }else throw problem(400,'Unknown cart action.');
  setCartCookie(res,next.id,config.session);
  return respond(res,200,publicCart(next));
 }catch(err){return fail(res,err);}
}
