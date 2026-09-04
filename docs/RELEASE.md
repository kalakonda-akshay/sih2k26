# Publishing the documents as a GitHub Release

The two HTML documents ship inside the app (`public/docs`, reachable from the
download control in the header) so the button works with no external
dependency — useful during a live demo where network conditions are unknown.

A GitHub Release is the better home for **versioned distribution**: stable
URLs, download counts, and no need to redeploy the app to publish a revision.

## Option A — GitHub web UI (no tooling, ~1 minute)

1. Open <https://github.com/kalakonda-akshay/sih2k26/releases/new>
2. **Choose a tag** → type `v1.0.0` → "Create new tag on publish"
3. **Release title**: `NER-Vision AI v1.0.0 — SIH26002`
4. Drag both files from `docs/` into the attachment area:
   - `technical-report.html`
   - `architecture-blueprint.html`
5. **Publish release**

## Option B — GitHub CLI

```bash
winget install --id GitHub.cli    # once
gh auth login                      # once
gh release create v1.0.0 \
  docs/technical-report.html \
  docs/architecture-blueprint.html \
  --title "NER-Vision AI v1.0.0 — SIH26002" \
  --notes "Technical report and architecture blueprint."
```

## After publishing

Asset URLs follow this pattern:

```
https://github.com/kalakonda-akshay/sih2k26/releases/download/v1.0.0/technical-report.html
https://github.com/kalakonda-akshay/sih2k26/releases/download/v1.0.0/architecture-blueprint.html
```

The header download menu currently points at the in-app copies under
`/docs/`. To serve from the release instead, swap the `href` values in
`src/components/layout/documents-menu.tsx`.

They are deliberately **not** pointed there yet: linking to a release that does
not exist would ship a control that 404s, and a visibly broken button is worse
than one extra deploy.
