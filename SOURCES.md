# Portfolio source and evidence register

This file records the basis for public-facing statements. It is an editorial aid, not a replacement for underlying records.

## Latest supplied resume (2026-11-08)

The latest owner-supplied resume supports: current PUP Quezon City BSIT enrollment (2026-present); CASAP STEM senior high school (2024-2026, Grade 96); Commonwealth High School junior high STE (2020-2024); Golden Lamp School elementary (2014-2020); six listed work roles and their supplied dates; Python capstone involving three game concepts; Arduino automatic sensor fan; Stop the Bleed first-aid certificate from the Philippine Red Cross; multiple-time Quiz Bee and Spelling competition wins; Best Paper Presenter in Applied Science; the listed technical/design skills; Filipino native and English intermediate. The badminton tournament second-place result is retained from the previously supplied CV information.

The latest resume does not state High Honors, With Honors, or Valedictorian; those distinctions are not used in the updated portfolio or CV. It also does not list Boy Scouts, so that item has been removed from the current activity list.

Separately supplied skill updates and documented project technologies are kept distinct: Java and SQL were previously included in the owner's skill list; MySQL, Git/GitHub, TypeScript, React, and Vite are shown where relevant as technologies used by project repositories. The portfolio's core skills section does not treat TypeScript/React as a self-rated proficiency claim.

## Direct owner confirmations (2026-11-08)

- The LinkedIn profile is `https://www.linkedin.com/in/king-art-pacumberto-6003b2353`.
- PUP Quezon City Hackathon: winner. The latest resume describes developing and presenting an innovative software solution in a team environment; event date, category, project title, and individual technical contribution are not specified.
- Commonwealth High School SSG / SSLG: progressed from Grade Level Representative to Auditor and Public Information Officer (PIO).
- CASAP Quezon City Glee Club: member and bass guitarist in the school's main band; performed at the school's Gala Night.
- Technology Club: officer. Technical Team: leader. Responsibilities included visual/video playback, speaker/audio setup, event technical operations, hardware/software troubleshooting, cable replacement, speaker troubleshooting, and primary handling of Mobile Legends: Bang Bang and Call of Duty: Mobile esports livestreams.
- Mathematics Club and Science Club: officer in both; helped with event planning and design.
- Badminton Club: player. Volunteer Photographer: covered a range of CASAP Quezon City activities, including casual events, sports, pageants, quiz bees, officers' portraits, competitive events, and documentation; handled photography, editing, and preparing images for posts.
- Exact dates for extracurricular roles and school-event productions were not supplied and are therefore not invented.

## Public project repositories

- GitHub profile: https://github.com/Legioniz
- LensLab: https://github.com/Legioniz/LensLab
- Smart Electrical Monitoring 2.13: https://github.com/Legioniz/Smart_Electrical_Monitoring_2.13
- Automated Fan Controller with Manual Control: https://github.com/Legioniz/Automated-Fan-Controller-with-Manual-Control

Smart Electrical Monitoring is described as a local demonstration using synthetic electricity data, not as a live utility integration. LensLab feature descriptions distinguish documented project direction from features that may still be in progress.

## TIMO public ranking

The 2025-2026 Thailand International Mathematical Olympiad Heat Round ranking lists KING ART PACUMBERTO, candidate no. 1005463, CASAP - Quezon City Campus, Senior Secondary Group, Gold Award.

Source: https://www.olympiad-champion.com/uploads/2/8/9/2/28923219/timo_heat_round_2526_ss_hk.pdf

## Quiz Bee research boundaries

Public school/event records inspected previously did not identify the owner as a participant or winner in a named contest. The general multiple-time Quiz Bee and Spelling Competition distinction appears in the supplied resume, so the portfolio uses that general wording only and does not attach it to an unverified school event or year.


## Visual design and accessibility references

The design system uses these current platform references for contrast, movement, reduced-motion preferences, native disclosure behavior, and efficient animation. They inform implementation and do not support personal profile claims.

- W3C — WCAG 2.2: https://www.w3.org/TR/WCAG22/
- W3C — Understanding Contrast Minimum: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- W3C — Understanding Pause, Stop, Hide: https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
- MDN — `details` element: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details
- MDN — `prefers-reduced-motion`: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using_for_accessibility
- web.dev — High-performance CSS animations: https://web.dev/articles/animations-guide
- Chrome — Scroll entry and exit effects: https://developer.chrome.com/docs/modern-web-guidance/guides/ui-behaviors/scroll-entry-exit-effects

## Responsive enhancement and progressive fallback references

- MDN - Resize Observer API: https://developer.mozilla.org/en-US/docs/Web/API/Resize_Observer_API
- MDN - Media queries and responsive design: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries/Using_media_queries
- MDN - VisualViewport API: https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport
- MDN - prefers-reduced-motion: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- GitHub Docs - Using custom workflows with GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

The layout remains CSS-first. JavaScript does not force a browser zoom level; it observes the resulting viewport changes only to tune optional visual effects. The adaptive profiler has safe defaults when browser/device hints are absent.


## Owner-reported OSINT and cybersecurity practice (2026-11-08)

The owner reports self-directed experience gathering publicly available information about individuals and companies, cross-checking details against official sources, and using the research for legitimacy checks and task-specific investigations. The portfolio describes this as public-source OSINT and preliminary verification, not as legal advice or a formal investigative credential.

The owner also reports foundational Linux and Kali Linux practice, local firewall configuration, port/traffic review, Nmap use, Medusa exposure, and isolated dummy-machine exercises. To avoid overstating capability, these are labeled self-directed and foundational. Medusa is described by Kali Linux as a parallel network login auditor / login brute-forcing tool; the portfolio therefore limits the description to authorized authentication-audit labs. Nmap is described in the official project documentation as a tool for network discovery and security auditing. Traffic/data spoofing and IP-spoofing are described only as concepts explored in isolated lab settings, not as a service or unrestricted capability. The tool name “Kraken” has not been added: the precise program or product is ambiguous from the name alone and needs owner confirmation before publication.

Reference documentation:
- Kali Linux Tools — Medusa: https://www.kali.org/tools/medusa/
- Official Nmap documentation: https://nmap.org/docs.html
- Official Nmap guide — Network discovery and security scanning: https://nmap.org/book/toc.html

## Profile image and responsive delivery

A portrait supplied by the owner on 2026-11-08 is included in the profile section. It is not embedded in source code. The source package includes responsive WebP and JPEG derivatives (480, 800, and 1023 pixel widths) and uses `picture`, `srcset`, and `sizes` so the browser selects an appropriate resource. The fallback initials panel appears if all image files fail to load. The image is loaded lazily because it appears below the hero. These implementation choices follow MDN responsive-image guidance:
- MDN — Using responsive images: https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images
- MDN — `picture` element: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/picture

## Personal application documents

Downloadable resume/CV files are intentionally excluded from the public repository and website. The portfolio's profile, experience, education, skills, and project summaries are maintained as on-page content instead.


## GitHub Pages Jekyll deployment

- GitHub Docs — [Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages): workflow permissions, Pages artifact upload, and deployment requirements.
- Official GitHub Action — [actions/jekyll-build-pages](https://github.com/actions/jekyll-build-pages): Jekyll packaging action, including its configurable `source` and `destination` inputs.

The current project is a React/Vite application. The workflow compiles it to `dist/`, then uses the official Jekyll action to package that generated static site into `_site/`. Jekyll is not used to compile the React/TypeScript source.
