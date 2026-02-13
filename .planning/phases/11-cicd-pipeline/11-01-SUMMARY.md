---
phase: 11-cicd-pipeline
plan: 01
subsystem: ci-cd
tags: [github-actions, deployment, nuxthub, cloudflare-pages]
dependency_graph:
  requires: []
  provides:
    - working-production-deploy-workflow
    - working-preview-deploy-workflow
  affects:
    - .github/workflows/deploy.yml
    - .github/workflows/preview.yml
tech_stack:
  added:
    - NuxtHub CLI deployment
  patterns:
    - GitHub Actions workflows with NuxtHub deploy
    - Preview URL extraction and PR commenting
key_files:
  created: []
  modified:
    - .github/workflows/deploy.yml
    - .github/workflows/preview.yml
decisions:
  - what: "Use NuxtHub CLI instead of Wrangler for deployments"
    why: "NuxtHub SSR apps are Worker-based, not static files. wrangler pages deploy doesn't work for SSR."
    alternatives: ["Keep wrangler (doesn't work)", "Manual Cloudflare Workers deployment"]
  - what: "Use NUXT_HUB_PROJECT_KEY for authentication"
    why: "NuxtHub provides unified authentication via project key instead of separate API tokens"
    alternatives: ["Keep CLOUDFLARE_API_TOKEN (incompatible with nuxthub CLI)"]
  - what: "Enhanced preview URL regex to match both .pages.dev and .nuxt.dev"
    why: "NuxtHub may deploy to either domain pattern depending on configuration"
    alternatives: ["Only match .pages.dev (might miss some deployments)"]
metrics:
  duration_seconds: 55
  tasks_completed: 2
  files_modified: 2
  commits: 2
  completed_at: "2026-02-13T03:13:08Z"
---

# Phase 11 Plan 01: Fix GitHub Actions Deploy Workflows Summary

**One-liner:** Replaced broken wrangler pages deploy with NuxtHub CLI for production and preview deployments

## What Was Built

Fixed both GitHub Actions workflows to use the correct NuxtHub deployment approach instead of the broken `wrangler pages deploy .output/public` pattern that doesn't work for SSR apps.

### Production Deploy Workflow (.github/workflows/deploy.yml)
- Replaced `wrangler pages deploy` with `npx nuxthub deploy --production --no-build`
- Switched authentication from `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` to `NUXT_HUB_PROJECT_KEY`
- Triggers on push to main branch
- Build happens in prior step, deploy uses `--no-build` flag

### Preview Deploy Workflow (.github/workflows/preview.yml)
- Replaced `wrangler pages deploy` with `npx nuxthub deploy --preview --no-build`
- Updated preview URL extraction regex to match both `.pages.dev` and `.nuxt.dev` domains
- Switched to `NUXT_HUB_PROJECT_KEY` authentication
- Captures preview URL from deploy output and posts it as PR comment
- Maintains `permissions: pull-requests: write` for PR commenting

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix production deploy workflow to use NuxtHub CLI | 0de9d77 | .github/workflows/deploy.yml |
| 2 | Fix preview deploy workflow to use NuxtHub CLI and post preview URL | 3511c14 | .github/workflows/preview.yml |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification criteria passed:

1. ✓ deploy.yml contains `nuxthub deploy --production`
2. ✓ preview.yml contains `nuxthub deploy --preview`
3. ✓ No references to `wrangler pages deploy` remain
4. ✓ Both workflows reference `NUXT_HUB_PROJECT_KEY` secret

## Next Steps

**User setup required before workflows can run:**

The workflows are now fixed but require the `NUXT_HUB_PROJECT_KEY` secret to be added to GitHub:

1. Generate project key: `npx nuxthub link` or get from NuxtHub Admin dashboard > Project Settings > Deploy Key
2. Add to GitHub: Repository Settings > Secrets and variables > Actions > New repository secret
3. Name: `NUXT_HUB_PROJECT_KEY`
4. Value: [the key from step 1]

**Testing:**
- Push to main to trigger production deploy
- Open a PR to trigger preview deploy and verify preview URL is commented

**Dependency for next plans:**
- Plan 11-02 (Playwright Tests) can build on these working deployment workflows
- Plan 11-03 (Lighthouse CI) can add quality gates to these workflows
- Plan 11-04 (Smoke Tests) can verify deployments succeed

## Self-Check: PASSED

All claims verified:

1. ✓ FOUND: .github/workflows/deploy.yml
2. ✓ FOUND: .github/workflows/preview.yml
3. ✓ FOUND: commit 0de9d77
4. ✓ FOUND: commit 3511c14
5. ✓ CLEAN: no wrangler pages deploy references remain
