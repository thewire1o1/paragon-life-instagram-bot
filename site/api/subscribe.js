// Paragon Life email-list opt-ins. Stored in a private Vercel Blob store.
import {createHash} from 'node:crypto';
import {put} from '@vercel/blob';

function json(res,status,body){
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 return res.status(status).end(JSON.stringify(body));
}
export default async function handler(req,res){
 if(req.method!=='POST'){res.setHeader('Allow','POST');return json(res,405,{error:'Method not allowed.'})}
 if(!process.env.BLOB_READ_WRITE_TOKEN&&!process.env.VERCEL_OIDC_TOKEN)return json(res,503,{error:'Signups are temporarily unavailable.'});
 let url;try{url=new URL(req.headers.origin||'')}catch{return json(res,403,{error:'Invalid origin.'})}
 if(url.protocol!=='https:'||url.host!==req.headers.host)return json(res,403,{error:'Invalid origin.'});
 const input=req.body||{};
 if(typeof input!=='object'||Array.isArray(input))return json(res,400,{error:'Invalid submission.'});
 const email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
 if(input.website)return json(res,200,{ok:true});
 if(email.length>254||!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email)||input.consent!==true)return json(res,400,{error:'Enter a valid email and agree to email updates.'});
 if(typeof input.startedAt!=='number'||Date.now()-input.startedAt<1800||Date.now()-input.startedAt>86400000)return json(res,400,{error:'Please reload and try again.'});
 const digest=createHash('sha256').update(email).digest('hex');
 const record={email,consent:true,consentText:'I agree to receive Paragon Life emails about projects, releases and updates.',updatedAt:new Date().toISOString(),source:'life.digitalparagon.com'};
 try{
  await put('newsletter/'+digest+'.json',JSON.stringify(record),{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:'application/json'});
  return json(res,200,{ok:true,message:"You're on the Paragon Life updates list."});
 }catch(e){console.error('Newsletter storage error',e?.name||'Unknown');return json(res,503,{error:'Signups are temporarily unavailable. Please try again.'})}
}