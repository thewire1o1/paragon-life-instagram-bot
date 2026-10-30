import test from 'node:test';
import assert from 'node:assert/strict';
import {encryptCart,decryptCart,checkoutURL,publicCart,validVariant,validLine} from '../api/_commerce.mjs';
const secret='test-secret-material-at-least-32-characters';
const id='gid://shopify/Cart/abc123?key=sensitive-token';
test('cart ID remains authenticated and encrypted',()=>{
 const sealed=encryptCart(id,secret);
 assert.equal(decryptCart(sealed,secret),id);
 assert.ok(!sealed.includes('sensitive-token'));
 assert.equal(decryptCart(sealed.slice(0,-4)+'xxxx',secret),null);
 assert.equal(decryptCart(sealed,'incorrect-secret-at-least-32-characters'),null);
});
test('only exact allowlisted Shopify checkout host passes',()=>{
 const config={domain:'example.myshopify.com'};
 assert.equal(checkoutURL('https://example.myshopify.com/checkouts/xyz',config),'https://example.myshopify.com/checkouts/xyz');
 assert.throws(()=>checkoutURL('https://example.myshopify.com.evil.test/checkout',config));
 assert.throws(()=>checkoutURL('http://example.myshopify.com/checkout',config));
});
test('validated GIDs and a sanitized public cart',()=>{
 assert.ok(validVariant('gid://shopify/ProductVariant/123'));
 assert.ok(!validVariant('gid://shopify/Other/123'));
 assert.ok(validLine('gid://shopify/CartLine/123'));
 assert.deepEqual(publicCart(null),{items:[],subtotal:0,currency:'USD',count:0});
});

import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
const root=new URL('../',import.meta.url);
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../assets/site.css',import.meta.url),'utf8');
test('Paragon Life original favicon is shipped and linked',()=>{
 assert.ok(existsSync(new URL('../assets/favicon.webp',import.meta.url)));
 assert.match(html,/<link rel="icon"[^>]+href="\/assets\/favicon.webp"/);
});
test('store navigation uses a visible shared shopping bag and preserves Instagram in footer',()=>{
 assert.match(html,/<button[^>]+id="cart-open"[^>]*>Bag \(<span id="cart-count">0<\/span>\)<\/button>/);
 assert.doesNotMatch(html,/<button[^>]+id="cart-open"[^>]* hidden/);
 const top=html.match(/<div class="top">[\s\S]*?<\/div>/)?.[0]||'';
 assert.doesNotMatch(top,/instagram/ig);
 assert.match(html,/<footer[\s\S]*?Instagram[\s\S]*?<\/footer>/);
});
test('actual Coffee brand mark and footer parent hierarchy remain consistent',()=>{
 const matches=[...html.matchAll(/class="coffee-brand-mark"/g)];
 assert.ok(matches.length>=3);
 assert.doesNotMatch(html,/<svg class="coffee-brand-mark"/);
 assert.match(html,/class="footer-parent-brand"[^>]*>Paragon Life<\/a>/);
 assert.match(html,/class="footer-children"/);
 assert.match(css,/\.external-link/);
});
test('YouTube appears immediately after approved hero, with no fake playable videos',()=>{
 assert.match(html,/id="youtube"/);
 assert.match(html,/VIDEOS COMING SOON/);
 assert.ok(html.indexOf('id="youtube"')<html.indexOf('id="projects"'));
 assert.match(html,/A Southern California Lifestyle Brand/);
});

test('homepage does not contain the redundant merchandise or Coffee promo section',()=>{
 assert.doesNotMatch(html,/id="shop"/);
 assert.doesNotMatch(html,/PARAGON<br>GOODS\./);
 assert.doesNotMatch(html,/COLLECTION COMING SOON/i);
 assert.doesNotMatch(html,/href="#shop"/);
 assert.match(html,/href="https:\/\/coffee\.digitalparagon\.com\//);
});
