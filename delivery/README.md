# Client release preparation

Client documentation templates are in `client/`. Prepare a separate source snapshot using:

```bash
python3 scripts/export-client-delivery.py
```

The default output is `.local/client-delivery/DentaBook-Client`, alongside a ZIP and a development-only export record. The exporter refuses an existing destination. Use a new `--output` path for later releases. It copies tracked client/server source plus the declared root configuration, adds these reviewed documents, checks local Markdown links and copied-file hashes, and excludes private development records.

The exported directory contains no Git history. Verify the code and documentation, then initialize that directory as an independent repository with a normal client-release commit. Do not copy the development `.git` directory. Keep runtime `.env`, backups, credentials, internal records, and local verification reports outside the release.

Intended GitHub destination: `TradsKraken/DentaBook_Client`, public as explicitly requested by the owner for this handoff. Create an empty repository under that owner with an authorized account, then push the independent client history. Do not create the repository under a different account as a substitute for missing owner permissions.

Future client updates should be explicit reviewed deliveries, with updated status, release notes, and verification. Preserve the client repository's own history when applying a later snapshot; do not force-push a new unrelated history over it. Client delivery and production deployment remain separate actions.
