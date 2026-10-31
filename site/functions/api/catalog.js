import {method,config,catalog,respond,fail} from '../../cloudflare/commerce.js';
export async function onRequest({request,env}){
 try{method(request,['GET']);return respond(200,{products:await catalog(config(env))},{'Cache-Control':'public, max-age=30, s-maxage=60'})}
 catch(e){return fail(e)}
}