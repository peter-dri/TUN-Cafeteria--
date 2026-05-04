Branching & PR workflow
------------------------

Follow this lightweight workflow to avoid merge conflicts and keep PRs easy to review:

- Branch from `master` for each feature or fix: `git checkout -b feature/your-topic master`
- Rebase onto latest `master` before opening a PR: `git fetch origin && git rebase origin/master`
- Keep PRs small and focused (one logical change per PR).
- Run the app locally and confirm basic functionality before pushing.

When resolving conflicts
-----------------------

- Rebase your branch onto `origin/master` rather than merging `master` into it when possible.
- If a conflict happens, resolve it locally, run the app, and push the updated branch.

Repository hygiene
-------------------

- Do not commit large binary files (SQLite DBs, uploads). Use `.gitignore` for local DB files.
- Prefer schema files (`database/schema.sql` or `database/sqlite-schema.sql`) instead of committing DB binaries.
- Keep dependencies up-to-date and add tests/linters so CI can catch regressions early.

Branch protection & CI (recommended)
-----------------------------------

- Protect `master` with required status checks and PR reviews in GitHub settings.
- Enable the repository CI workflow (already added under `.github/workflows/ci.yml`).

If you need help
---------------

Open an issue or ping the maintainer with the PR number and a short description of what you changed.
