# Monthly patching

Add a dated section after each month's dependency review. Record resolved versions, the reason for each change, and any findings left for follow-up.

## 2026-10-27

| Dependency | From | To | Why |
| --- | --- | --- | --- |
| `axios` | 1.19.0 | 1.20.0 | Fix request-handling, prototype-pollution and denial-of-service advisories. |
| `body-parser` | 2.3.0 | 2.4.0 | Fix denial of service from trailing bytes after compressed request bodies. |
| `vitest` and `@vitest/coverage-v8` | 4.1.11 | 4.1.12 | Fix mock-registration injection and path-traversal advisories. |
| `follow-redirects` (lockfile) | 1.16.0 | 1.16.1 | Fix sensitive-header exposure across redirects. |
| `proxy-addr` (lockfile) | 2.0.7 | 2.0.8 | Fix IPv4-mapped IPv6 trust-subnet IP spoofing. |
| `source-map-js` (lockfile) | 1.2.1 | 1.2.2 | Fix event-loop denial of service through source-map offsets. |
| `vite` (lockfile) | 8.3.0 | 8.3.5 | Fix dev-server/editor and file-access advisories. |

The initial full audit reported 9 findings (1 critical, 5 high, 3 moderate). After compatible updates, full and production audits both report zero findings. No overrides or major upgrades were required. The existing local `.npmrc` release-age policy was retained.

`npm ci --ignore-scripts` passed. The coverage-enabled unit suite passed: 2 files, 20 tests and 7 existing skipped external-service tests; all coverage thresholds passed. The explicit Biome check of `package.json` and `git diff --check` passed. `npm run quality` processed no files because its branch comparison does not include these uncommitted changes.

The full local Docker stack was rebuilt with the patched dependencies. App and verify returned HTTP 200, all five internal service checks passed, and PostgreSQL, Redis, ClamAV and pgAdmin responded. Running service dependency versions matched the patched lockfiles. Existing databases and Orbit stub state were retained; live payment, email and address-provider transactions were not exercised.
