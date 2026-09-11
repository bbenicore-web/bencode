# UX/UI Agent Skills

Project skills from [plugin87/ux-ui-agent-skills](https://github.com/plugin87/ux-ui-agent-skills) **v2.5.1**, installed so Cursor and Claude agents in this repo can use design tokens, component specs, accessibility, and runnable `/skills`.

## How to invoke

In Cursor or Claude Code, type a slash command (`/design-tokens`, `/a11y-audit`, …) or ask in plain language. `CLAUDE.md` loads the design-architect brief and routes the request. `AGENTS.md` lists when to use the kit.

| Command | What it does |
| --- | --- |
| `/design-tokens` | Generate / extend / validate DTCG tokens, palettes, multi-brand theming |
| `/design-component` | Spec a component (anatomy, variants, 8 states, a11y) |
| `/design-code` | Generate code for any framework via the Adapter Protocol |
| `/design-review` | Score a design (6 dimensions + Nielsen) with a findings table |
| `/a11y-audit` | WCAG 2.2 audit + contrast checks |
| `/apply-aesthetic` | Apply an archetype or one of 138 named design systems |
| `/redesign` | Audit-first upgrade of an existing UI without breaking it |
| `/brandkit` | Brand foundation from a brief: tokens, light + dark, theme.css |
| `/image-to-code` | Screenshot or mockup becomes token-driven, accessible code |
| `/prototype` | Move up the fidelity ladder + plan usability testing |
| `/migrate-design-system` | Map to/from Material 3, Apple HIG, shadcn, Radix, etc. |
| `/ux-writing` | Write/review buttons, errors, empty states, microcopy |
| `/token-build` | Tokens to CSS, Tailwind, iOS, Android, Compose |
| `/figma-integration` | Token to Figma Variable sync and component parity |
| `/design-qa` | Stand up the CI gates that keep regressions out |
| `/governance` | Version, contribute, deprecate |
| `/performance` | Core Web Vitals, layout shift, animation cost |

Typical flow:

```text
/apply-aesthetic linear
/design-component Combobox
/design-code Combobox in React + Tailwind
/a11y-audit
/design-review
```

## Layout

Official installers were used (not a hand-copy of the upstream git tree):

1. `npx ux-ui-agent-skills init` — full kit at the repo root (tokens, components, a11y, taste, 138 design systems, scripts, `CLAUDE.md`, `.claude/skills/`, `.claude/rules/`).
2. `npx skills add plugin87/ux-ui-agent-skills --agent cursor --copy -y` — Cursor / Agent Skills copies plus `skills-lock.json`.
3. Skills were also mirrored into `.cursor/skills/` so this repo matches Cursor project-skill discovery.

| Path | Role |
| --- | --- |
| `.cursor/skills/` | Cursor project skills (`SKILL.md` per command) |
| `.claude/skills/` | Claude Code runnable skills |
| `.agents/skills/` | Agent Skills standard copy (from `npx skills add`) |
| `CLAUDE.md` | Always-on design-architect brief + request router |
| `AGENTS.md` | Bencode project routing for Cursor agents |
| `tokens/` | DTCG design tokens |
| `components/` | Atomic Design component specs |
| `accessibility/` | WCAG 2.2 + ARIA |
| `taste/` | Anti-slop doctrine and aesthetic archetypes |
| `design-systems/` | Interop + library of 138 systems |
| `frameworks/` | Adapter Protocol + framework adapters |
| `workflows/` | Review, handoff, QA, Figma, performance |
| `content/` | Voice and tone |
| `scripts/` | Token/contrast validators and other gates (alongside existing deploy scripts) |
| `skills-lock.json` | Pin for `npx skills update` |

GitHub Pages does not publish these folders. `.github/workflows/pages.yml` copies only the site allowlist.

## Helper scripts

From the repo root (Python 3, no extra deps for the token/contrast gates):

```bash
python3 scripts/validate_tokens.py
python3 scripts/validate_contrast.py
python3 scripts/contrast.py "#1d1d1f" "#ffffff"
python3 scripts/design_systems.py list
python3 scripts/scaffold_component.py "Date Picker"
```

Existing bencode scripts (`scripts/deploy-gh-pages.sh`, `scripts/export-png.mjs`) are unchanged.

## Update

Re-run the official installers; `--force` overwrites kit files:

```bash
npx ux-ui-agent-skills add claude tokens components taste design-systems frameworks accessibility workflows content scripts skills rules --force
npx skills add plugin87/ux-ui-agent-skills --agent cursor --copy -y
cp -R .claude/skills/. .cursor/skills/
```

Do not hand-edit the 138 `design-systems/library/` specs. Customize brand tokens in `tokens/` instead.
