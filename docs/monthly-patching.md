# Monthly patching

Insert each new `## YYYY-MM-DD` entry immediately below these instructions,
before older entries (reverse date order, newest first). Include only a
**Dependency / From / To / Why** table listing patched dependencies or override
changes, actual old/new versions and one short reason each. Preserve earlier
entries; do not copy their verbose sections. Keep audits, test output,
commands, hashes and artifact details in separate review evidence; report
unresolved findings in the handoff, not extra log sections.

## 2026-11-16

| Dependency | From | To | Why |
| --- | --- | --- | --- |
| `follow-redirects` | 1.16.1 | 1.16.3 | Prevent custom credentials leaking across redirects. |

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
