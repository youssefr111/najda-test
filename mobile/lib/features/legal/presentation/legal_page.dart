import 'package:flutter/material.dart';

import '../../../core/theme/app_palette.dart';
import '../../../core/widgets/back_header.dart';
import '../../../core/widgets/screen_scaffold.dart';

/// Frame shared by every static page (about / privacy / terms).
class LegalPage extends StatelessWidget {
  const LegalPage({required this.title, required this.children, super.key, this.intro});

  final String title;
  final String? intro;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return ScreenScaffold(
      scroll: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          BackHeader(title: title, fallbackLocation: '/'),
          if (intro != null) ...[
            Text(intro!, style: TextStyle(fontSize: 15, height: 1.5, color: p.textMuted)),
            const SizedBox(height: 16),
          ],
          ...children,
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

class LegalSection extends StatelessWidget {
  const LegalSection({required this.title, super.key, this.body, this.bullets = const []});

  final String title;
  final String? body;
  final List<String> bullets;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: p.text)),
          if (body != null) ...[
            const SizedBox(height: 6),
            Text(body!, style: TextStyle(fontSize: 15, height: 1.5, color: p.textMuted)),
          ],
          for (final bullet in bullets)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Container(
                      height: 5,
                      width: 5,
                      decoration: BoxDecoration(color: p.textMuted, shape: BoxShape.circle),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(bullet, style: TextStyle(fontSize: 15, height: 1.5, color: p.textMuted)),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
