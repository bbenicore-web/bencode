# Agent instructions

This repository is **bencode**: a GitHub Pages site with a Canvas CPO org chart, an electricity tracker (`electricity/`), a Mega 5G landing (`mega-5g/`), and a resume.

## UX/UI Agent Skills

**REQUIRED SKILL:** Use the plugin87 UX/UI kit whenever the user asks for design tokens, components, accessibility, visual direction, UX writing, redesign, or production UI code.

Source: [plugin87/ux-ui-agent-skills](https://github.com/plugin87/ux-ui-agent-skills) v2.5.1. Usage notes: [`docs/ux-ui-agent-skills.md`](docs/ux-ui-agent-skills.md). Design-architect brief: [`CLAUDE.md`](CLAUDE.md).

Skill folders (same 17 skills, mirrored for agent discovery):

- Cursor: `.cursor/skills/<name>/SKILL.md`
- Claude Code: `.claude/skills/<name>/SKILL.md`
- Agent Skills standard: `.agents/skills/<name>/SKILL.md`

Knowledge layers live at the repo root so skill-relative paths resolve: `tokens/`, `components/`, `accessibility/`, `taste/`, `design-systems/`, `frameworks/`, `workflows/`, `content/`, `.claude/rules/`, `scripts/`.

### Invoke

Type a slash command, or describe the work in natural language (the brief in `CLAUDE.md` routes it).

| Command | When |
| --- | --- |
| `/design-tokens` | Generate, extend, or validate DTCG tokens |
| `/design-component` | Spec a component (anatomy, variants, 8 states, a11y) |
| `/design-code` | Generate production UI code for any framework |
| `/design-review` | Score a design (6 dimensions + Nielsen) |
| `/a11y-audit` | WCAG 2.2 audit and contrast checks |
| `/apply-aesthetic` | Apply an archetype or one of 138 design systems |
| `/redesign` | Audit-first upgrade of an existing UI |
| `/brandkit` | Brand foundation from a brief (tokens + theme.css) |
| `/image-to-code` | Screenshot or mockup to token-driven code |
| `/prototype` | Fidelity ladder, journeys, usability tests |
| `/migrate-design-system` | Map to/from Material 3, Apple HIG, shadcn, Radix, … |
| `/ux-writing` | Buttons, errors, empty states, microcopy |
| `/token-build` | Tokens to CSS, Tailwind, iOS, Android, Compose |
| `/figma-integration` | Token to Figma Variable sync |
| `/design-qa` | CI gates that keep regressions out |
| `/governance` | Version, contribute, deprecate |
| `/performance` | Core Web Vitals, layout shift, animation cost |

Do not apply the design-architect persona to unrelated git, deploy, or backend-only work. GitHub Pages still publishes only the allowlisted site files in `.github/workflows/pages.yml`.
