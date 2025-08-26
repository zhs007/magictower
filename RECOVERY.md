# Recovery record — main reset

Date: 2025-08-26

Summary
-------
This repository's `main` branch was reset and force-pushed to commit
`14dfc4fa8b4428f907854724f00abbc89d1bc0f4` on 2025-08-26.

Why
---
Requested by repository owner to revert `main` to the specified commit.

Actions performed
-----------------
- Fetched remote refs and verified target commit exists locally.
- Created a local backup branch preserving the previous `main` HEAD:
  `backup/main-before-reset-20250826-122604` -> original commit `c0c01817c1f8bd95bfdd6d40fb6bb181e96fa971`
- Performed: `git reset --hard 14dfc4fa8b4428f907854724f00abbc89d1bc0f4` on `main`.
- Force-pushed `main` to `origin` so remote `main` now points to the target commit.
- Pushed the backup branch and created an annotated tag on the backup:
  Tag: `backup-main-before-reset-20250826-122604` -> `c0c01817c1f8bd95bfdd6d40fb6bb181e96fa971`

Verification
------------
- Remote `main` ref: `14dfc4fa8b4428f907854724f00abbc89d1bc0f4` (verified via `git ls-remote`).
- Backup branch on origin: `origin/backup/main-before-reset-20250826-122604` exists and points to the pre-reset commit.
- Backup tag on origin: `backup-main-before-reset-20250826-122604` created and pushed.

Smoke tests
-----------
- `npm install` completed with no vulnerabilities reported.
- `npm run build` (vite build) succeeded; build artifacts written to `dist/`.
- `npm run test:ci` (vitest --run) executed and all tests passed: 108 tests, 0 failures.

Recovery steps (if you need to restore the previous main)
-----------------------------------------------------
1. Fetch remote refs: `git fetch origin`
2. Reset `main` to the backup ref (local or remote):

   - Using remote branch: `git checkout main && git reset --hard origin/backup/main-before-reset-20250826-122604 && git push --force origin main`
   - Or using tag: `git checkout main && git reset --hard backup-main-before-reset-20250826-122604 && git push --force origin main`

Notes
-----
- Force-pushing rewrote `origin/main` history. Team members should reset their local `main` branches:
  `git fetch origin && git checkout main && git reset --hard origin/main`
- `jules/jules.md` was untracked in the working tree during the reset and remains untracked locally; it was not committed or lost.

Recorded by: automated assistant executing requested operations on behalf of repository owner.
