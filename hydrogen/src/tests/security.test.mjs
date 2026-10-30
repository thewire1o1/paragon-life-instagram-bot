import test from 'node:test';import assert from 'node:assert/strict';import {handleAPI,seal,unseal} from '../server/index.js';
const origin='https://life.digitalparagon.com';
const request=(path,method='GET',headers={})=>new Request(origin+path,{method,headers:{Origin:origin,...headers}});
test('store fails closed and does not leak configuration',async()=>{const response=await handleAPI(request('/api/catalog'),{});assert.equal(response.status,503);assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');const c=await(await handleAPI(request('/api/config'),{})).json();assert.equal(c.mode,'disabled')});
test('cross-origin mutation rejected',async()=>{const r=await handleAPI(new Request(origin+'/api/checkout',{method:'POST',headers:{Origin:'https://evil.example'},body:'{}'}),{});assert.equal(r.status,403)});
test('AES-GCM cart token tampering fails',async()=>{const c={session:'test-paragon-life-secret-longer-than-thirty-two-characters'};const id='gid://shopify/Cart/abc?key=private';const a=await seal(id,c);assert.equal(await unseal(a,c),id);assert.equal(await unseal(a.slice(0,-2)+'XX',c),null);assert.ok(!a.includes('private'))});
test('checkout is gated before Shopify is connected',async()=>{const r=await handleAPI(request('/api/checkout','POST'),{});assert.equal(r.status,503)});
