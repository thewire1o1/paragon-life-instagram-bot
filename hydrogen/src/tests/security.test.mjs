import test from 'node:test';import assert from 'node:assert/strict';import {handleAPI,seal,unseal} from '../server/index.js';
const origin='https://life.digitalparagon.com';
const request=(path,method='GET',headers={})=>new Request(origin+path,{method,headers:{Origin:origin,...headers}});
test('store fails closed and does not leak configuration',async()=>{const response=await handleAPI(request('/api/catalog'),{});assert.equal(response.status,503);assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');const c=await(await handleAPI(request('/api/config'),{})).json();assert.equal(c.mode,'disabled')});
test('cross-origin mutation rejected',async()=>{const r=await handleAPI(new Request(origin+'/api/checkout',{method:'POST',headers:{Origin:'https://evil.example'},body:'{}'}),{});assert.equal(r.status,403)});
test('AES-GCM cart token tampering fails',async()=>{const c={session:'test-paragon-life-secret-longer-than-thirty-two-characters'};const id='gid://shopify/Cart/abc?key=private';const a=await seal(id,c);assert.equal(await unseal(a,c),id);assert.equal(await unseal(a.slice(0,-2)+'XX',c),null);assert.ok(!a.includes('private'))});
test('checkout is gated before Shopify is connected',async()=>{const r=await handleAPI(request('/api/checkout','POST'),{});assert.equal(r.status,503)});

import {readFileSync,existsSync} from 'node:fs';
const root=readFileSync(new URL('../../app/root.jsx',import.meta.url),'utf8');
const landing=readFileSync(new URL('../../app/routes/_index.jsx',import.meta.url),'utf8');
test('Hydrogen ships authentic Life favicon and Coffee mark',()=>{
 assert.ok(existsSync(new URL('../../public/assets/favicon.webp',import.meta.url)));
 assert.match(root,/href:'\/assets\/favicon.webp'/);
 assert.match(root,/coffee\.digitalparagon\.com\/assets\/brand\/paragon-monogram.webp/);
 assert.doesNotMatch(root,/function CoffeeMark\(\)\{return <svg/);
});
test('Hydrogen keeps shared bag and top-level YouTube and South California identity',()=>{
 assert.match(root,/Open shopping bag/);
 assert.match(root,/life-cart-drawer/);
 assert.match(root,/A Southern California Lifestyle Brand/);
 assert.match(landing,/id="youtube"/);
 assert.match(landing,/VIDEOS COMING SOON/);
});

test('Hydrogen homepage is creator-led, without merchandise placeholder section',()=>{
 assert.doesNotMatch(landing,/id="featured"/);
 assert.doesNotMatch(landing,/Shop the collection/);
 assert.doesNotMatch(landing,/Collection coming soon/);
 assert.match(landing,/Explore the videos/);
});

test('Hydrogen preserves branded DP credit and compact creator layout',()=>{assert.match(root,/digital-paragon-icon\.png/);assert.match(root,/Designed &amp; developed by Digital Paragon/);assert.doesNotMatch(landing,/EPISODE 01/);});
