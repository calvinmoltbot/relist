@AGENTS.md

# Help Guide Maintenance

When you change, add, or remove a feature in the app, **always review `src/lib/help-registry.ts`** before finishing the task:

1. Check if any existing help entries describe the changed feature — update their descriptions if behaviour changed
2. If you added a new feature, add a help entry for it (follow the existing pattern: id, title, description, category, group, context)
3. If you removed a feature, remove its help entry
4. Keep descriptions written for Lily (22, Vinted reseller) — plain English, no jargon, practical

This keeps help in sync incrementally instead of requiring periodic audits.
