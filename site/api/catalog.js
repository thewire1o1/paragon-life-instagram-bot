import {allowMethod,storeConfig,catalog,respond,fail} from './_commerce.mjs';
export default async function handler(req,res){
 try{allowMethod(req,['GET']);const products=await catalog(storeConfig());return respond(res,200,{products},{'Cache-Control':'public, max-age=30, s-maxage=60'});}
 catch(err){return fail(res,err);}
}