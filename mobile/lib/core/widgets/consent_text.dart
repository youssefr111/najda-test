import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme/app_palette.dart';

/// A sentence with tappable "Terms" and "Privacy Policy" links.
///
/// The sentence comes from the translations with the link text wrapped in tags,
/// e.g. `By continuing, you agree to our <terms>Terms</terms> and <privacy>Privacy Policy</privacy>.`
/// Keeping the whole sentence (and where the links sit in it) in the ARB file
/// means each language can phrase it naturally; no concatenated fragments.
///
/// The links open the app's own Terms / Privacy screens: instant, available
/// offline, and the person never leaves the sign-up flow.
class ConsentText extends StatefulWidget {
  const ConsentText({
    required this.template,
    super.key,
    this.textAlign = TextAlign.start,
    this.fontSize = 13,
  });

  final String template;
  final TextAlign textAlign;
  final double fontSize;

  @override
  State<ConsentText> createState() => _ConsentTextState();
}

class _ConsentTextState extends State<ConsentText> {
  static final _tag = RegExp(r'<(terms|privacy)>(.*?)</\1>', dotAll: true);

  final _recognizers = <TapGestureRecognizer>[];

  void _disposeRecognizers() {
    for (final recognizer in _recognizers) {
      recognizer.dispose();
    }
    _recognizers.clear();
  }

  @override
  void dispose() {
    _disposeRecognizers();
    super.dispose();
  }

  List<InlineSpan> _spans(BuildContext context, TextStyle linkStyle) {
    _disposeRecognizers();

    final template = widget.template;
    final spans = <InlineSpan>[];
    var cursor = 0;

    for (final match in _tag.allMatches(template)) {
      if (match.start > cursor) {
        spans.add(TextSpan(text: template.substring(cursor, match.start)));
      }

      final route = match.group(1) == 'terms' ? '/terms' : '/privacy';
      final recognizer = TapGestureRecognizer()
        ..onTap = () => context.push(route);
      _recognizers.add(recognizer);
      spans.add(
        TextSpan(
          text: match.group(2),
          style: linkStyle,
          recognizer: recognizer,
        ),
      );
      cursor = match.end;
    }
    if (cursor < template.length) {
      spans.add(TextSpan(text: template.substring(cursor)));
    }
    return spans;
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final base = TextStyle(
      fontSize: widget.fontSize,
      height: 1.45,
      color: p.textMuted,
    );
    final link = base.copyWith(
      color: p.primary,
      fontWeight: FontWeight.w700,
      decoration: TextDecoration.underline,
      decorationColor: p.primary,
    );

    return Text.rich(
      TextSpan(style: base, children: _spans(context, link)),
      textAlign: widget.textAlign,
    );
  }
}
