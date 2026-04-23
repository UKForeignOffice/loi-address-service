# LOI Address Service

Please refer to https://github.com/UKForeignOffice/loi-application-service for setup instructions

## About

This repo complements the LOI Application Service by adding address lookup functionality


## Code Quality

This project uses **Biome** for formatting and linting.

**Available commands:**
- `npm run format` — Format and lint all files
- `npm run quality` — Check only changed files against the `develop` branch

**VSCode Setup:**

Install the [Biome extension](https://biomejs.dev/guides/editors/vscode/) (`biomejs.biome`), then add to `.vscode/settings.json`:

```jsonc
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  }
}
```

For other IDE see https://biomejs.dev/guides/getting-started/#editor-integrations
