# Well Control Website — Production Deployment

Production URL: `https://well-control.eaxmarketplace.com`

Upload the **contents** of `dist` to the document root for `well-control.eaxmarketplace.com`. Keep all filenames and the `assets` directory unchanged.

## Final checks

1. Confirm HTTPS is active and the final browser URL matches the canonical URL.
2. Open all three legal pages and test every footer link.
3. Confirm `https://well-control.eaxmarketplace.com/sitemap.xml` loads; submit it to Google Search Console and Bing Webmaster Tools.
4. If the domain already has a root `/robots.txt`, merge this package's sitemap declaration into it.
5. Test `matt@eaxmarketplace.com` links on desktop and mobile.
6. Replace the two “Coming soon” store controls with live Apple and Google URLs when available.
7. Confirm the published homepage displays all five modules and nine quiz choices.
8. Purge the CDN cache after deployment.
9. In Google Search Console, inspect `https://well-control.eaxmarketplace.com` and request indexing after the first deployment.
10. Add the live Apple App Store and Google Play listing URLs to the homepage and structured data as soon as the app is published.
11. Link to this page from the main EAX Marketplace website using descriptive wording such as “Well Control app for IWCF Level 3 and Level 4 practice”.
12. Monitor Search Console impressions and queries monthly. Improve genuinely useful content around the queries receiving impressions; do not repeat keywords unnaturally.
13. In Google Analytics, confirm real-time page views appear under measurement ID `G-9LXN46ZM80` and use the hostname `well-control.eaxmarketplace.com`.

`_headers` is for compatible static hosts. `.htaccess` supplies core equivalents for Apache. Apply matching rules in Nginx, Cloudflare or another host where required.

## App-store URLs

- Support and marketing: `https://well-control.eaxmarketplace.com`
- Privacy: `https://well-control.eaxmarketplace.com/privacy-policy.html`
