# WCQ Site

Public website source project for the Well Control mobile learning app.

## Commands

- `yarn install` installs Parcel and local development dependencies.
- `yarn dev` starts Parcel for local development.
- `yarn build` compiles the site into `public/`.
- `yarn review:local` checks the built site package for required files, local links, and development-environment protections.

This project has a local `.npmrc` so public Parcel dependencies resolve from
`https://registry.yarnpkg.com/` instead of inheriting a machine-level private
registry.

The site keeps production static paths stable because app-store metadata,
service-worker cache entries, sitemap, manifest, and deployment packages depend
on them.

On `localhost`, `127.0.0.1`, and `::1`, the site disables production Google
Analytics and unregisters/clears local Well Control service-worker state to
keep development sessions predictable. Deployment, upload, CDN, search-console,
and store actions are intentionally outside this local source project workflow.
