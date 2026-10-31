# Paragon Life Cloudflare Pages deployment

Cloudflare Pages target (separate from Paragon Coffee): source `thewire1o1/paragon-life-instagram-bot`, branch `site-paragon-life-v2`, **root directory `site`**, build command `npm run build:cloudflare`, output directory `dist`, Functions under `site/functions`.

Shopify server-only secrets/bindings to configure on the Life Pages project when its independent store is ready:
- `SHOPIFY_STORE_DOMAIN`
- `SHOPIFY_STOREFRONT_PRIVATE_TOKEN`
- `PARAGON_SESSION_SECRET` (minimum 32 characters)
- `SHOPIFY_API_VERSION` (optional, defaults to 2026-07)
- `SHOPIFY_CHECKOUT_DOMAIN` (optional)
- `PARAGON_CHECKOUT_ENABLED` (must remain false until store is tested)

Workers-native Pages Functions replace the Vercel Node API. The encrypted cart cookie has the same AES-256-GCM wire format as the previous site. Missing secrets keep store APIs closed, and static pages remain available.

**Do not update DNS or remove the existing Vercel deployment until the new `*.pages.dev` URL is deployed and tested.** Keep Squarespace as DNS registrar/provider and add the final Cloudflare-provided CNAME for `life`.
