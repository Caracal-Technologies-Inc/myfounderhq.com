import 'package:flutter/material.dart';

// These are typed, reusable implementations of the patterns recorded in:
// Airtable "Codebase: Flutter" / Header, Left Slide-Out Menu,
// App Screen Cards, Right Slide-Out Menu and Popup Modal.
// Raw source fragments remain preserved in Supabase, separate from executable UI.

class HqPalette {
  static const purple = Color(0xFF713CE1);
  static const lilac = Color(0xFFF0E8FF);
  static const background = Color(0xFFF8F7FE);
  static const ink = Color(0xFF211934);
}

class HqBrandLabel extends StatelessWidget {
  const HqBrandLabel({super.key, required this.label});
  final String label;
  @override
  Widget build(BuildContext context) => Text(
    label,
    maxLines: 1,
    overflow: TextOverflow.ellipsis,
    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
  );
}

class HqLeftMenuItem extends StatelessWidget {
  const HqLeftMenuItem({
    super.key,
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => ListTile(
    selected: selected,
    selectedTileColor: HqPalette.lilac,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
    leading: Icon(icon, size: 18, color: selected ? HqPalette.purple : null),
    title: Text(label, maxLines: 2, overflow: TextOverflow.ellipsis),
    onTap: onTap,
  );
}

class HqLeftDrawerShell extends StatelessWidget {
  const HqLeftDrawerShell({super.key, required this.header, required this.children});
  final Widget header;
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => SafeArea(
    child: Column(children: <Widget>[
      header,
      Expanded(child: ListView(children: children)),
    ]),
  );
}

class HqInfoCard extends StatelessWidget {
  const HqInfoCard({
    super.key,
    required this.title,
    required this.subtitle,
    required this.icon,
    this.onTap,
  });
  final String title;
  final String subtitle;
  final IconData icon;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) => Card(
    child: InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(children: <Widget>[
          Icon(icon, size: 28),
          const SizedBox(width: 12),
          Expanded(child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(title, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 4),
              Text(subtitle),
            ],
          )),
        ]),
      ),
    ),
  );
}

class HqRightDetailPanel extends StatelessWidget {
  const HqRightDetailPanel({super.key, required this.width, required this.title, required this.children});
  final double width;
  final String title;
  final Widget children;
  @override
  Widget build(BuildContext context) => Align(
    alignment: Alignment.centerRight,
    child: SizedBox(
      width: width,
      child: Material(
        elevation: 8,
        child: SafeArea(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(title, style: Theme.of(context).textTheme.titleLarge),
            ),
            const Divider(height: 1),
            Expanded(child: children),
          ]),
        ),
      ),
    ),
  );
}

Future<bool> showHqConfirmDialog(
  BuildContext context, {
  required String title,
  required String body,
  String cancelLabel = 'Cancel',
  String confirmLabel = 'Confirm',
}) async => await showDialog<bool>(
  context: context,
  builder: (context) => AlertDialog(
    title: Text(title),
    content: Text(body),
    actions: [
      TextButton(
        onPressed: () => Navigator.of(context).pop(false),
        child: Text(cancelLabel),
      ),
      FilledButton(
        onPressed: () => Navigator.of(context).pop(true),
        child: Text(confirmLabel),
      ),
    ],
  ),
) ?? false;
