import {allowMethod,requireOrigin,storeConfig,readCart,cookieFrom,checkoutURL,problem,respond,fail} from './_commerce.mjs';
export default async function handler(req,res){
 try{
  allowMethod(req,['POST']);requireOrigin(req);
  if(process.env.PARAGON_CHECKOUT_ENABLED!=='true')throw problem(503,'Checkout is not open.');
  const config=storeConfig(),cart=await readCart(config,cookieFrom(req,config.session));
  if(!cart?.totalQuantity)throw problem(409,'Your bag is empty.');
  return respond(res,200,{url:checkoutURL(cart.checkoutUrl,config)});
 }catch(err){return fail(res,err);}
}
