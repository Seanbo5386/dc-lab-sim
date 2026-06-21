# Data Center Lab Simulator — Roadmap

_Last updated: June 2026 (v1.5.0)_

## Current State

The simulator is feature-complete for its core mission: browser-based NCP-AII certification prep.

| Metric              | Value                                                   |
| ------------------- | ------------------------------------------------------- |
| Version             | 1.5.0                                                   |
| Command simulators  | 20 (229 CLI definitions across 17 categories)           |
| Narrative scenarios | 40 story-driven labs across all 5 exam domains          |
| Exam questions      | 199 practice + 65 tool selection + 175 deep mastery     |
| Architectures       | DGX A100, H100, H200, B200, GB200, VR200                |
| Unit tests          | 3,751 (0 TypeScript errors, 0 lint warnings)            |
| E2E tests           | 453 Playwright tests across 3 viewports                 |
| Authentication      | AWS Cognito (sign up, sign in, email verification)      |
| Cloud sync          | Progress, quiz scores, and learning data across devices |
| CI/CD               | GitHub Actions (lint, test, build)                      |

---

## v1.2.0 — Production Auth & Performance

**Goal:** Make authentication work for all visitors and reduce initial load time.

| Task                                     | Priority   | Effort     | Description                                                                                                      |
| ---------------------------------------- | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| ~~Deploy Amplify backend to production~~ | ~~High~~   | ~~Low~~    | ✅ Done — Cognito auth and DynamoDB cloud sync live on dclabsim.com                                              |
| ~~Bundle splitting~~                     | ~~High~~   | ~~Medium~~ | ✅ Done — main chunk reduced from 2,304 kB to 1,077 kB via vendor chunks, React.lazy(), and dynamic JSON imports |
| ~~DGX GB200 & VR200 architectures~~      | ~~Medium~~ | ~~Medium~~ | ✅ Done — GB200 (Blackwell Ultra) and VR200 (Vera Rubin) added to spec registry, factory, simulators, and UI     |
| Dependency updates                       | Medium     | Low        | Migrate `xterm` to `@xterm/xterm`, clear deprecated packages (90 npm audit findings, mostly transitive)          |

---

## v1.3.0 — Testing & Reliability

**Goal:** Catch regressions before they reach production.

| Task                        | Priority | Effort     | Description                                                                                           |
| --------------------------- | -------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| ~~E2E smoke tests~~         | ~~High~~ | ~~Medium~~ | ✅ Done — 307 Playwright tests across 7 spec files (commands, scenarios, visual regression, missions) |
| Error boundary improvements | Medium   | Low        | Graceful fallbacks for cloud sync failures, network issues                                            |
| Lighthouse CI               | Low      | Low        | Automated performance/accessibility scoring in CI pipeline                                            |

---

## v1.4.0 — Offline & Mobile

**Goal:** Usable anywhere, on any device.

| Task                           | Priority | Effort | Description                                                                |
| ------------------------------ | -------- | ------ | -------------------------------------------------------------------------- |
| PWA / Service Worker           | Medium   | Medium | Cache app shell for offline study — useful for exam prep on the go         |
| Responsive layout improvements | Medium   | High   | Tablet-friendly terminal and dashboard layouts (currently best at 1280px+) |
| Touch-friendly terminal        | Low      | Medium | On-screen keyboard shortcuts for tablet users                              |

---

## Future Considerations

These are ideas that may or may not happen. They're listed for reference, not commitment.

### Content

- More scenarios beyond 40 (community contributions welcome)
- Scenario-based exam questions with simulated terminal output
- Video walkthrough integration for complex labs

### Community & Platform

- Achievement/badge system for completed missions
- Study streak tracking
- Export progress as PDF study report
- Instructor dashboard with class progress tracking
- Custom scenario editor
- LMS integration (SCORM/xAPI)

### Technical

- WebSocket support for multi-user collaborative troubleshooting
- Command history search (Ctrl+R)
- Accessibility audit (WCAG AA) — keyboard navigation, screen reader, high contrast
- Internationalization framework

---

## Versioning

This project uses [Semantic Versioning](https://semver.org/):

- **Major** (2.0, 3.0): Breaking changes or major architectural shifts
- **Minor** (1.1, 1.2): New features, content additions
- **Patch** (1.1.1): Bug fixes, typos, dependency updates

---

## Contributing

Priority areas for contribution:

1. New exam questions (especially Domains 4 and 5)
2. Scenario authoring for advanced topics
3. Command output accuracy improvements (validated against real DGX systems)
4. E2E test coverage
5. Accessibility enhancements

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.
