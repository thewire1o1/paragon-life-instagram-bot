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
