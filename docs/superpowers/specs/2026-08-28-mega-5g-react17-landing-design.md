# Mega 5G landing on supplied React 19 app

## Goal

Publish the provided Mega 5G mobile demo as a self-contained application at `/bencode/mega-5g/`. Faithful reproduction and delivery speed take priority over a React 17 port, so the supplied React 19 implementation remains intact. The existing root site, resume, and electricity tracker must remain unchanged.

## Source of truth

- Visual and interaction reference: `https://zhenchur.github.io/mega-5g-mobile-demo/`
- Provided implementation reference and assets: `https://github.com/zhenchur/mega-5g-mobile-demo`
- The new implementation preserves the reference content, imagery, fonts, section order, motion, and interactions without copy changes.

## Architecture

The landing lives in an isolated `mega-5g/` directory copied from the reference repository, including its React 19 source, GSAP motion, package files, configuration, and public assets. Only nested-route deployment configuration is changed; the app does not impose dependencies on the existing root package.

The application will be configured with the GitHub Pages base path `/bencode/mega-5g/`. Its production build will be copied to `_site/mega-5g/` by the existing deployment workflow. Root deployment files and the electricity build remain part of the same published artifact.

## Page structure

The React application will mirror the reference section hierarchy:

1. Mobile header and navigation.
2. Mega 5G promotional hero.
3. Key-benefit summary.
4. Detailed feature cards.
5. Mega 5G profile/product selection.
6. Connection instructions and device presentation.
7. FAQ/details content.
8. Promotional footer and legal/navigation links.

Large visual sections remain in the React components supplied by the reference: promo, details, experience carousel, products, connection, tariffs, and footer.

## Responsive behavior

- At viewport widths up to and including `767px`, the complete landing is shown.
- Above `767px`, the landing is replaced by the same desktop notice as the reference, directing visitors to open the page on a phone or narrow the browser.
- The mobile implementation must not be limited to one exact iPhone viewport: fluid widths, safe-area insets, and bounded typography will prevent horizontal overflow on common mobile widths while retaining the original composition.

## Interaction and motion

The implementation will preserve the reference behavior for carousel controls, expandable details/FAQ, product-card actions, and scroll-linked or entrance motion. Motion will be implemented locally in React and CSS with cleanup for listeners and observers.

`prefers-reduced-motion` will disable nonessential movement without removing content or controls. Keyboard focus and semantic button behavior will be retained for interactive elements.

## Assets

Fonts, images, and SVG artwork from the reference repository are copied into `mega-5g/public/`. Vite's GitHub Pages base and `%BASE_URL%` HTML preloads keep asset URLs correct under the nested route. No runtime dependency on the reference GitHub Pages site is allowed.

## Failure behavior

The landing is static and has no backend dependency. If JavaScript is unavailable, the HTML shell will still provide the page title and a short message. Missing optional motion APIs will fall back to a static layout. Asset paths will be validated in the production build so deployment under the nested route does not produce root-relative 404s.

## Verification

An automated Node deployment-contract test covers the nested Vite base, base-aware preloads, retained React 19/GSAP dependencies, root test discovery, and workflow build/copy steps. The supplied app's `check` and `build:pages` scripts validate its source and production build.

Manual browser verification will cover representative mobile widths, the `767px`/`768px` boundary, desktop notice behavior, animations, interactive controls, absence of horizontal overflow, and the built nested route. A short walkthrough recording will demonstrate the finished mobile landing and desktop notice.

## Deployment

The GitHub Actions workflow will install and build the isolated React app in addition to the existing root tests and electricity build. The output will be copied to `_site/mega-5g/` before the existing `gh-pages` publication step. The final public URL will be:

`https://bbenicore-web.github.io/bencode/mega-5g/`

