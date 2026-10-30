# Paragon Life (Hydrogen / Cloudflare Pages)
Independent storefront sharing Paragon Coffee's **framework and Cloudflare build workflow**, without sharing its Shopify store or runtime secrets.

## Status
This is **migration source**, not the live deployed site. The production domain currently serves the existing Vercel version. Do not point DNS at this build until Cloudflare Pages deployment, header tests, images, mobile review and shop checkout are verified.

## Build
In `hydrogen/`, run:
```sh
npm ci
npm run build:cloudflare
```
Cloudflare Pages output: `dist/client`. The build script places Hydrogen's Worker at `dist/client/_worker.js`.

## Environment
Create a **distinct** Paragon Life Shopify store, install the Headless channel, publish Life merchandise, and put the private Storefront token in Cloudflare Pages secrets. Set `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_STOREFRONT_PRIVATE_TOKEN`, `SHOPIFY_API_VERSION`, and `PARAGON_SESSION_SECRET` with >=32 random characters. For Hydrogen context use `PUBLIC_STORE_DOMAIN`, `PUBLIC_STOREFRONT_API_TOKEN`, and `SESSION_SECRET` separately. No Paragon Coffee keys, cart state, products, or customer sessions are reused.

Keep `PARAGON_COMMERCE_MODE=disabled` until all merchandise, order, tax, shipping, and fulfillment flows are set up. Keep `PARAGON_CHECKOUT_ENABLED=false` until an end-to-end Shopify test checkout is verified. Product prices and inventory are always pulled from Shopify in live mode.

## Cutover checklist
1. Test build and HTTP headers on a Cloudflare Pages preview.
2. Confirm DNS, TLS, policies, real product catalog, cart, checkout, Shop Pay, account handling, and order/fulfillment tests.
3. Configure `life.digitalparagon.com` with Cloudflare Pages, verify no interruption, and retire Vercel after success.
