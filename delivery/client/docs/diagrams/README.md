# Diagram assets

The [diagram guide](../11_DIAGRAMS_AND_WORKFLOWS.md) provides the visual index, status labels, and explanations. SVG files are the published vector diagrams. Matching `.mmd` files in `src/` are their editable Mermaid sources.

## Updating a diagram

1. Check the relevant route, schema, or operating procedure.
2. Edit the corresponding source in `src/`.
3. Render a matching SVG using a trusted Mermaid editor or Mermaid CLI.
4. Verify that current/planned labels remain accurate and legible.
5. Update the guide, HTML handbook, PDF, and file manifest in the same client release.

With Mermaid CLI installed, a single source can be rendered with:

```bash
mmdc -i src/02-patient-workflow.mmd -o 02-patient-workflow.svg
```

Use a blue-and-white theme, readable labels, and an appropriate export background. Keep HTML labels disabled for portable SVG text. The supplied exports were rendered with Mermaid 11.12.0; the website itself does not require Mermaid at runtime.

In the relationship diagrams, `||` means exactly one, `o|` means zero or one, and `o{` means zero or many. PK is a primary key, FK a foreign key, and UK a unique key. The supplied diagrams show selected columns only; the SQL schema and migrations remain the full technical reference.
