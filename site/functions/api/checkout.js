import {method,origin,config,readCart,cartId,checkoutURL,problem,respond,fail} from '../../cloudflare/commerce.js';
export async function onRequest({request,env}){
 try{
  method(request,['POST']);origin(request);
  if(env.PARAGON_CHECKOUT_ENABLED!=='true')throw problem(503,'Checkout is not open.');
  const cfg=config(env),cart=await readCart(cfg,await cartId(request,cfg.session));
  if(!cart?.totalQuantity)throw problem(409,'Your bag is empty.');
  return respond(200,{url:checkoutURL(cart.checkoutUrl,cfg)});
 }catch(e){return fail(e)}
}