# Paragon Life v2

Independent automotive, technology, projects and apparel website.

## Status

The editorial design is a review preview. Shopify integration endpoints are included, but **no Shopify checkout is enabled** until a new Paragon Life Shopify store is claimed and connected. No Coffee credentials or catalog are reused.

## Production requirements

- Connect the distinct Paragon Life Shopify store and its Headless sales channel. Set `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_STOREFRONT_PRIVATE_TOKEN`, `SHOPIFY_API_VERSION` and at least a 32-character random `PARAGON_SESSION_SECRET` as server-only secrets.
- Publish and verify apparel products, variants, inventory, taxes, shipping, payment, order notifications, customer accounts, and policies in the *Life* store.
- Keep `PARAGON_CHECKOUT_ENABLED=false` until checkout test orders, inventory and refund flows pass. Then set it to `true`.
- Configure the `life.digitalparagon.com` DNS and TLS on the selected host. The domain has not been switched by this repository update.
- After the design is approved, migrate and test the storefront against the production Cloudflare Pages/Hydrogen architecture from Paragon Coffee. The staging Vercel deployment is not the final production topology.

## Security

API requests fail closed if Shopify secrets are missing. Origin checks apply to all cart mutations. Shopify cart IDs stay in AES-GCM authenticated, Secure, HttpOnly, SameSite cookies; Storefront private tokens stay server-side. Checkout URLs are allowlisted. Global response headers include CSP, HSTS, frame denial and MIME sniffing protection. Production signoff requires external testing of the deployed host and store settings.
