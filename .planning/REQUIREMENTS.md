# Requirements: Recipe Remix Engine

**Defined:** 2026-02-13
**Core Value:** Users can make delicious, creative meals from ingredients they already have

## v1.2 Requirements

Requirements for v1.2 — CI/CD, Branching & Production Polish. Each maps to roadmap phases.

### CI/CD

- [ ] **CICD-01**: Deploy to Production workflow succeeds on push to main
- [ ] **CICD-02**: Deploy Preview workflow creates preview deployment on PRs and comments preview URL
- [ ] **CICD-03**: CI Gates (bundle size check + Lighthouse) run on PRs and block merge on failure
- [ ] **CICD-04**: Smoke tests run automatically after production deploy and report results

### Branching & Workflow

- [ ] **BRCH-01**: Branch protection on main requires PR review and passing CI status checks
- [ ] **BRCH-02**: Feature branches are created from GitHub issues using consistent naming
- [ ] **BRCH-03**: PR template exists with checklist for testing and review

### Production URL

- [ ] **URL-01**: All codebase references use https://remix-recipe.com (verify completeness)
- [ ] **URL-02**: Custom domain remix-recipe.com configured on Cloudflare Pages and resolves
- [ ] **URL-03**: Better Auth trusted origins updated for new domain

### Hero Slider Images

- [ ] **IMG-01**: Featured recipes in database have imageKey populated with actual images
- [ ] **IMG-02**: Hero slider displays actual recipe images from NuxtHub blob storage
- [ ] **IMG-03**: Graceful fallback with gradient placeholder when image is missing

## Future Requirements

### v2.0 (deferred)

- **SCAN-01**: User can scan fridge/pantry via photo
- **VOICE-01**: User can add ingredients via voice input
- **NUTR-01**: User can view nutritional information for recipes
- **SOCIAL-01**: User can see trending recipes from other users

## Out of Scope

| Feature | Reason |
|---------|--------|
| Automated testing suite (unit/integration) | Focus on CI/CD pipeline and deployment — testing comes later |
| Custom domain SSL/TLS configuration | Cloudflare handles SSL automatically |
| Multiple environment support (staging) | Production + preview deploys sufficient for now |
| GitHub Actions self-hosted runners | Standard GitHub runners sufficient |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CICD-01 | TBD | Pending |
| CICD-02 | TBD | Pending |
| CICD-03 | TBD | Pending |
| CICD-04 | TBD | Pending |
| BRCH-01 | TBD | Pending |
| BRCH-02 | TBD | Pending |
| BRCH-03 | TBD | Pending |
| URL-01 | TBD | Pending |
| URL-02 | TBD | Pending |
| URL-03 | TBD | Pending |
| IMG-01 | TBD | Pending |
| IMG-02 | TBD | Pending |
| IMG-03 | TBD | Pending |

**Coverage:**
- v1.2 requirements: 13 total
- Mapped to phases: 0
- Unmapped: 13

---
*Requirements defined: 2026-02-13*
*Last updated: 2026-02-13 after initial definition*
