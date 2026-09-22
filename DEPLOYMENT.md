# Well Control Website — Production Deployment

Production URL: `https://well-control.eaxmarketplace.com`

Build output lives in `public/`. Upload the **contents** of `public/` to the
document root for `well-control.eaxmarketplace.com` when using a manual static
host. Keep generated filenames and the `assets/build/` directory unchanged.

## GitHub Pages

The repository includes `.github/workflows/pages.yml` for GitHub Pages.

1. In the GitHub repository, set Pages **Build and deployment** source to
   **GitHub Actions**.
2. Configure the custom domain in GitHub Pages settings if
   `well-control.eaxmarketplace.com` should be served by GitHub Pages.
3. Update DNS at the DNS provider only after the desired GitHub Pages target is
   confirmed.
4. Push an authorized `main` change or run the workflow manually.
5. Confirm the workflow builds, reviews, uploads `public/`, and deploys to the
   `github-pages` environment.

Custom-domain setup, DNS changes, manual workflow runs, pushes, deployments,
CDN purge, Search Console, Bing, and store updates are external actions and
should be performed only when explicitly authorized.

GitHub Pages does not apply `_headers` or Apache `.htaccess` rules. The site
therefore relies on content-hashed build assets, mutable shell revalidation
where the host supports it, and the generated service worker for freshness.

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
