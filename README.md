# WCQ Site

Public website source project for the Well Control mobile learning app.

## Commands

- `yarn install` installs Parcel and local development dependencies.
- `yarn dev` starts Parcel for local development.
- `yarn build` compiles the site into `public/`.
- `yarn review:local` checks the built site package for required files, local links, and development-environment protections.
- `yarn review:github-pages` checks the GitHub Pages workflow shape.
- `yarn test` builds `public/` and runs both local reviews.

This project has a local `.npmrc` so public Parcel dependencies resolve from
`https://registry.yarnpkg.com/` instead of inheriting a machine-level private
registry.

The site keeps page and shell paths stable while build assets use content
hashes. The deployable package is `public/`.

On `localhost`, `127.0.0.1`, and `::1`, the site disables production Google
Analytics and unregisters/clears local Well Control service-worker state to
keep development sessions predictable. Deployment, upload, CDN, search-console,
and store actions are intentionally outside this local source project workflow.

## GitHub Pages

The repository includes `.github/workflows/pages.yml`, based on the local
Parcel/Yarn workflow. It installs from `yarn.lock`, runs `yarn test`, uploads
`public/`, and deploys through GitHub Pages.

For GitHub Pages, configure the GitHub repository's Pages source to use GitHub
Actions. Custom domain and DNS setup are repository/provider actions and are
not performed by local build commands.
