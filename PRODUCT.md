# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: **current patients** of NZOZ „Nasz-Lekarz” – adults and seniors in Jelenia Góra (the clinic has no paediatrician). They come for a short, task-driven visit, usually from Google or the Maps listing, often on a phone: which number to call for their matter, whether registration is answering right now, today's doctors and hours, how to get a prescription for regular medication, where the clinic is and how to get in (1st floor, lift), what to do when the clinic is closed.

Also served by existing content (not the primary audience): family members calling on a patient's behalf, and people transferring to the clinic (POZ declaration pages).

## Product Purpose

An informational website for a family-medicine practice (POZ) contracted with NFZ – services are free for insured patients. It exists to answer, quickly and without error, "whom to call and when", and to cut avoidable phone traffic and confusion. Success: a patient finds the right number, the right hours and the right next step in seconds, at any time of day, including evenings, weekends and holidays.

## Positioning

**Information, not advertising.** A local NFZ clinic whose site competes on accuracy and speed of answer, not on persuasion: the current state ("registration is answering until 15:00", "closed – night care at ul. Ogińskiego 6"), plain language, and accessibility. Promotion is ruled out by law (ban on advertising by healthcare providers, art. 14 of the Act on Medical Activity).

## Operating Context

- Phone is the primary channel: registration 75 642 25 50 (Mon–Fri 9:00–15:00), procedure room, office. No online booking exists (`onlineRegistrationUrl` empty) – the site must not imply one.
- Clinic open Mon–Fri 8:00–18:00; after 15:00 registration does not answer but the doctor sees walk-ins until 18:00. Closed weekends and Polish public holidays (computed in `src/assets/js/holidays.js`).
- Out of hours: night and holiday care (NiŚOZ) at ul. Ogińskiego 6, NFZ teleconsultation line 800 137 200, emergency 112 / 999 – all from `src/_data/clinic.json`.
- E-services patients use: e-prescription (SMS code), Internetowe Konto Pacjenta (IKP).
- Printed phone sheet (`/kartka-z-telefonami/`) is a real artefact patients keep at home.

## Capabilities and Constraints

- Static site: Eleventy 3 + Nunjucks, vanilla CSS and a small JS module; hosted on OVHcloud; test version on GitHub Pages (`PATH_PREFIX`, `noindex`).
- Clinic data lives in `src/_data/clinic.json`, `team.json`, `faq/*.json` (current convention; not a binding constraint).
- Live state in the browser (registration open/closed, today's doctors) using Europe/Warsaw time and Polish holidays; the full site must work without JS.
- Binding: **no cookies, analytics, tracking, external fonts, maps or CDNs**; CSP `style-src 'self'` – no inline `style=` attributes in HTML.
- Binding: **no advertising content** – no testimonials, ratings, rankings, "best", promotional claims or stock photography; photos of people only with written consent (none exist today).
- Open / unconfirmed facts (marked in data, must not be presented as certain): procedure-room and office hours (`[DO POTWIERDZENIA]`), home-visit rules (`verified: false`), nurses' names, doctors' PWZ numbers, RPWDL number, e-mail, DPO contact.

## Brand Commitments

- Name: NZOZ „Nasz-Lekarz” (legal entity: AD C sp. z o.o.). NAP must match everywhere: al. Wojska Polskiego 57, 58-500 Jelenia Góra, registration phone from `clinic.json`.
- Logo: house with heart (`src/_includes/partials/logo.njk`, `src/static/favicon.svg`).
- Voice: Polish, plain language, second person, answer first ("Zadzwoń – w jakiej sprawie?"), calm and factual.

## Evidence on Hand

- Real data: phones, hours, address, building access (lift), doctors' names and schedules, night-care and SOR details with sources (`clinic.json`, `team.json`).
- FAQ content in 9 topics (`src/_data/faq/`).
- No photos of staff or interior, no patient reviews, no statistics – future work must not fabricate any of these.

## Product Principles

1. **State before content** – the first thing a patient sees answers "what can I do right now?".
2. **Never wrong, never vague** – one source of data; unconfirmed facts stay marked, never guessed.
3. **Inform, never sell** – legal and ethical limit on persuasion; credibility comes from accuracy.
4. **Works for everyone, always** – any device, any eyesight, with or without JS, at any hour.

## Accessibility & Inclusion

- WCAG 2.2 AA as the floor, with body text contrast ≥ 7:1 in light and dark modes.
- Text size switch A / A+ / A++ (100 / 112.5 / 125 %), layouts must hold at 320 px and 200 % zoom.
- Honour `prefers-color-scheme`, `prefers-reduced-motion`, `prefers-contrast`, `prefers-reduced-transparency`, `forced-colors`.
- Touch targets ≥ 44 px; state never conveyed by colour alone.
- Many users are older or have low vision; the site must remain fully usable without JavaScript.
