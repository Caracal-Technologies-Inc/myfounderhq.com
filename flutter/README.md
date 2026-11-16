# MyFounderHQ Flutter rebuild (parallel, NOT production)

This is the beginning of a **parallel Flutter Web implementation** of MyFounderHQ.
The existing Next.js application remains live at https://myfounderhq.com.
Do not change the Vercel production root or deployment configuration until the
Flutter replacement is reviewed and tested against the approved UI manuals.

## Authoritative source and migration

Source Airtable base: **Codebase: Flutter**, ID `app07IZtkfFQbsjco`.
This is distinct from the backup and from `Codebase: Flutter (Editable)`.

All 44 source records from these 9 tables were copied **without executing code**:
Backend (10), Header (5), Top Slide Menu (4), Left Slide-Out Menu (4),
App Screen Cards (5), Right Slide-Out Menu (4), Bottom Slide Menu (4),
Footer (4), Popup Modal (4).

Supabase storage:
- `public.hq_flutter_component_sources`: record/table provenance, original
  Dart snippet, editable text, generated code, placeholder names, revision,
  validation lifecycle. Imported rows all begin as **Imported**, not Tested.
  A new revision number can preserve history when source code changes.
- `public.hq_flutter_screen_blueprints`: owner-scoped page specifications
  as JSON node trees with Draft → Reviewed → Approved → Implemented → Tested
  states. No screen should be called complete based on a screenshot alone.

The code in Airtable contains **fragments**, not a complete compilable app.
Some `Generated Code` entries are JavaScript exports rather than Dart. We
preserve these source fields but do not execute them as Flutter code.

## Reusable building blocks

`lib/hq_blocks.dart` implements typed widgets grounded in the Airtable
patterns: Header Brand, Left Menu Item, Left Drawer Shell, Info Card,
Right Detail Panel, and Confirm Dialog.

`lib/blueprint_renderer.dart` renders a strict allowlist of Flutter widgets
from approved JSON node descriptions. It does **not** evaluate raw Dart strings
from the database. Missing actions or unapproved components are not invented.

`lib/hq_screens.dart` begins the real Supabase-connected Businesses,
Employees, component catalogue and Settings pages. Other pages openly say
they are not rebuilt yet. Existing production records are not copied.

## Run locally after Flutter SDK setup

```sh
cd flutter
flutter pub get
flutter analyze
flutter test
flutter run -d chrome \
  --dart-define=SUPABASE_URL=https://<your-project>.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=<public-publishable-or-anon-key>
```

Only a **public/publishable** Supabase key belongs in a Flutter client. Never
embed `service_role` or any private API key. Configure Supabase Auth's allowed
URLs for the Flutter dev origin as appropriate.

## Required gates before changing production

1. Complete a screenshot/reference manual for each page with component
   inventory, properties, layout constraints, responsive behavior, and the
   visible result of every interaction.
2. Approve the JSON blueprint and its data-binding/permission map.
3. Validate Dart fragments and upgrade them to typed widgets with tests.
4. Run `flutter analyze`, `flutter test`, and browser/device UI verification.
5. Verify authenticated RLS reads/writes on Supabase and storage permissions.
6. Compare Flutter to the approved reference screenshots, not ad-hoc redesign.
7. Deploy on an isolated preview domain and test migration/rollback.
8. Promote only after explicit final acceptance.

**Current state:** source migrated; scaffold and first typed blocks committed;
Flutter app not built or browser-tested in this environment. No live migration.
