# Beachfront Print Co

Website for Beachfront Print Co, a custom apparel and print shop in Duxbury, MA,
featuring a quote-based custom apparel line and a single premade product — the
Give-Back Towel, which donates half its profit to Parkinson's disease research.

## Structure

- `index.html` — full one-page site (hero, about, custom apparel, product, impact, contact/quote form)
- `styles.css` — design tokens + styles
- `script.js` — scroll animations (GSAP/ScrollTrigger with a no-JS/no-GSAP fallback), nav, form + checkout wiring
- No build step — open `index.html` directly or serve the folder with any static host.

## One-time setup before launch

The site ships with two clearly-marked placeholders. Until you replace them, the
site shows an on-page "not connected yet" note instead of a broken link.

### 1. Stripe Payment Link (towel checkout)

1. In your Stripe Dashboard, create a **Payment Link** for the Give-Back Towel ($32),
   with adjustable quantity if you want customers to buy more than one.
2. Copy the payment link URL.
3. In `index.html`, find the `Buy Now` button (`id="buyTowelBtn"`) and replace
   `data-stripe-link="REPLACE_WITH_STRIPE_PAYMENT_LINK"` with your real URL.

### 2. Formspree (custom order quote form)

1. Create a free account at [formspree.io](https://formspree.io) and add a new
   form pointed at `beachfrontprintco@gmail.com`.
2. Copy your form ID.
3. In `index.html`, find `<form id="quoteForm" ...>` and replace
   `REPLACE_WITH_FORMSPREE_ID` in the `action` attribute with your real form ID.
4. File uploads (artwork) require a paid Formspree plan; on the free plan you can
   remove the `artwork` field or ask customers to reply to the confirmation email
   with their file attached.

## Imagery

All product/brand visuals are currently elegant placeholder illustrations built
in inline SVG (wireframe wave hero, towel mockup, shoreline art) so the site
loads fast with zero image weight. Swap them for real photography whenever it's
ready — the two reference video files provided are a good source for hero stills.

## Impact numbers

The "Our Impact" section stat cards are placeholders (`data-count-to` attributes
in `index.html`) — update the running donation total as real sales come in, and
name your Parkinson's research partner once finalized.

## Development

Static site, no build step. Open `index.html` in a browser, or serve the folder
locally, e.g. `python -m http.server`.
