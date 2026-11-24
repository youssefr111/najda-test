import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';

/// `[label](/path)`: the only markup legal texts support, and only for pages of the app itself.
final _link = RegExp(r'\[([^\]]+)\]\((/[A-Za-z0-9/_-]*)\)');

/// A text where `[Support](/support)` becomes a tappable link. Everything else is plain text.
/// With no [onLinkTap] the label is shown as plain text (e.g. inside the acceptance prompt).
class LegalRichText extends StatefulWidget {
  const LegalRichText({
    required this.text,
    required this.style,
    super.key,
    this.onLinkTap,
  });

  final String text;
  final TextStyle style;
  final ValueChanged<String>? onLinkTap;

  @override
  State<LegalRichText> createState() => _LegalRichTextState();
}

class _LegalRichTextState extends State<LegalRichText> {
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

  @override
  Widget build(BuildContext context) {
    _disposeRecognizers();
    final spans = <InlineSpan>[];
    var last = 0;

    for (final match in _link.allMatches(widget.text)) {
      if (match.start > last) {
        spans.add(TextSpan(text: widget.text.substring(last, match.start)));
      }
      final label = match.group(1)!;
      final path = match.group(2)!;
      final onTap = widget.onLinkTap;
      if (onTap == null) {
        spans.add(TextSpan(text: label));
      } else {
        final recognizer = TapGestureRecognizer()..onTap = () => onTap(path);
        _recognizers.add(recognizer);
        spans.add(
          TextSpan(
            text: label,
            recognizer: recognizer,
            style: TextStyle(
              color: Theme.of(context).colorScheme.primary,
              decoration: TextDecoration.underline,
            ),
          ),
        );
      }
      last = match.end;
    }
    if (last < widget.text.length) {
      spans.add(TextSpan(text: widget.text.substring(last)));
    }

    return Text.rich(TextSpan(children: spans), style: widget.style);
  }
}
