# Roadmap: Recipe Remix Engine

**Created:** 2026-02-04

---

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-02-11) | [Archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Test on Production** — Phases 7-10 (shipped 2026-02-13) | [Archive](milestones/v1.1-ROADMAP.md)
- 🚧 **v1.2 CI/CD, Branching & Production Polish** — Phases 11-13 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-6) — SHIPPED 2026-02-11</summary>

- [x] Phase 1: Foundation (4/4 plans) — completed 2026-02-05
- [x] Phase 2: Core Read Path (6/6 plans) — completed 2026-02-06
- [x] Phase 3: Pantry and User Features (5/5 plans) — completed 2026-02-08
- [x] Phase 4: AI Generation Pipeline (6/6 plans) — completed 2026-02-10
- [x] Phase 5: Fusion Intelligence and Polish (4/4 summaries) — completed 2026-02-11
- [x] Phase 6: Observability and Hardening (4/4 summaries) — completed 2026-02-11

</details>

<details>
<summary>✅ v1.1 Test on Production (Phases 7-10) — SHIPPED 2026-02-13</summary>

- [x] Phase 7: Deployment + Production Validation (3/3 plans) — completed 2026-02-12
- [x] Phase 8: SEO + Sharing (2/2 plans) — completed 2026-02-13
- [x] Phase 9: UI/UX Polish (3/3 plans) — completed 2026-02-13
- [x] Phase 10: Performance Optimization (3/3 plans) — completed 2026-02-13

</details>

### 🚧 v1.2 CI/CD, Branching & Production Polish

**Milestone Goal:** Make CI/CD pipelines fully operational, enforce PR-based workflow with branch protection, verify production URL migration, and display actual recipe images in the hero slider.

- [x] **Phase 11: CI/CD Pipeline** — All GitHub Actions workflows running and succeeding end-to-end (completed 2026-02-13)
- [x] **Phase 12: Branching & Production URL** — Branch protection enforced, PR workflow established, production domain verified (completed 2026-02-13)
- [ ] **Phase 13: Hero Slider Images** — Hero slider displays actual recipe images from blob storage

## Phase Details

### Phase 11: CI/CD Pipeline
**Goal**: Every GitHub Actions workflow (deploy, preview, CI gates, smoke tests) runs successfully and provides reliable feedback
**Depends on**: Nothing (v1.1 laid groundwork, this phase fixes and verifies)
**Requirements**: CICD-01, CICD-02, CICD-03, CICD-04
**Success Criteria** (what must be TRUE):
  1. Pushing to main triggers a production deploy that completes successfully on Cloudflare Pages
  2. Opening a PR creates a preview deployment and posts the preview URL as a comment on the PR
  3. CI gates (bundle size check and Lighthouse) run on PRs and report pass/fail status that can block merge
  4. Smoke tests run automatically after production deploy and results are visible in GitHub Actions
**Plans**: 4 plans

Plans:
- [x] 11-01-PLAN.md — Fix deploy + preview workflows to use wrangler pages deploy
- [x] 11-02-PLAN.md — Fix CI gates (bundle size check + Lighthouse CI)
- [x] 11-03-PLAN.md — Fix smoke tests workflow + update test selectors
- [x] 11-04-PLAN.md — Validate all workflows and end-to-end verification

### Phase 12: Branching & Production URL
**Goal**: Main branch is protected with mandatory PRs and passing CI, feature branches follow a consistent workflow, and the production domain remix-recipe.com is fully operational
**Depends on**: Phase 11 (CI gates must work before branch protection can require them)
**Requirements**: BRCH-01, BRCH-02, BRCH-03, URL-01, URL-02, URL-03
**Success Criteria** (what must be TRUE):
  1. Direct pushes to main are rejected — all changes require a PR with at least one passing CI check
  2. Creating a GitHub issue produces a feature branch with consistent naming (e.g., feature/123-description)
  3. Opening a PR shows a pre-filled template with testing and review checklist
  4. Visiting https://remix-recipe.com loads the application with all features working (auth, recipes, images)
  5. Better Auth login/signup works correctly on the remix-recipe.com domain (no CORS or origin errors)
**Plans**: 2 plans

Plans:
- [x] 12-01-PLAN.md — Branch protection, PR template, and issue templates
- [x] 12-02-PLAN.md — Production URL verification and Better Auth domain config

### Phase 13: Hero Slider Images
**Goal**: The homepage hero slider showcases actual recipe images instead of placeholders, with graceful fallback handling
**Depends on**: Nothing (independent of CI/CD and branching work)
**Requirements**: IMG-01, IMG-02, IMG-03
**Success Criteria** (what must be TRUE):
  1. Featured recipes in the database have imageKey values pointing to actual recipe images in blob storage
  2. The hero slider on the homepage displays real recipe photos that load correctly
  3. When a recipe image is missing or fails to load, a styled gradient placeholder appears instead of a broken image
**Plans**: TBD

Plans:
- [ ] 13-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 11 → 12 → 13
(Phase 13 is independent and could execute in parallel with 11 or 12 if needed)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 4/4 | Complete | 2026-02-05 |
| 2. Core Read Path | v1.0 | 6/6 | Complete | 2026-02-06 |
| 3. Pantry and User Features | v1.0 | 5/5 | Complete | 2026-02-08 |
| 4. AI Generation Pipeline | v1.0 | 6/6 | Complete | 2026-02-10 |
| 5. Fusion Intelligence and Polish | v1.0 | 4/4 | Complete | 2026-02-11 |
| 6. Observability and Hardening | v1.0 | 4/4 | Complete | 2026-02-11 |
| 7. Deployment + Production Validation | v1.1 | 3/3 | Complete | 2026-02-12 |
| 8. SEO + Sharing | v1.1 | 2/2 | Complete | 2026-02-13 |
| 9. UI/UX Polish | v1.1 | 3/3 | Complete | 2026-02-13 |
| 10. Performance Optimization | v1.1 | 3/3 | Complete | 2026-02-13 |
| 11. CI/CD Pipeline | v1.2 | 4/4 | Complete | 2026-02-13 |
| 12. Branching & Production URL | v1.2 | 2/2 | Complete | 2026-02-13 |
| 13. Hero Slider Images | v1.2 | 0/TBD | Not started | - |

---
*Last updated: 2026-02-17 — Phase 12 complete*
