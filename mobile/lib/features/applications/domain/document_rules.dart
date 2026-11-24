import 'responder_application.dart';

/// Same extensions the server accepts for application documents (it checks the
/// extension, not the MIME type).
const applicationDocumentExtensions = [
  'jpg',
  'jpeg',
  'png',
  'webp',
  'pdf',
  'doc',
  'docx',
];

const _mb = 1024 * 1024;
const maxDocumentMb = 10;

/// The server rejects a whole request over 25 MB; this leaves headroom for the form fields.
const maxTotalDocumentsMb = 20;

enum DocumentProblemReason { type, size, total }

class DocumentProblem {
  const DocumentProblem(this.reason, this.fileName);

  final DocumentProblemReason reason;
  final String fileName;
}

typedef DocumentCheck = ({
  List<PickedDocument> accepted,
  DocumentProblem? problem,
});

/// Splits newly picked files into those that can be attached and the last
/// problem found, so nothing fails late at submit time. Mirrors the web's rules.
DocumentCheck checkDocuments(
  List<PickedDocument> current,
  List<PickedDocument> incoming,
) {
  final accepted = <PickedDocument>[];
  DocumentProblem? problem;
  var totalBytes = current.fold<int>(0, (sum, d) => sum + d.sizeBytes);

  for (final file in incoming) {
    final dot = file.name.lastIndexOf('.');
    final extension = dot < 0 ? '' : file.name.substring(dot + 1).toLowerCase();

    if (!applicationDocumentExtensions.contains(extension)) {
      problem = DocumentProblem(DocumentProblemReason.type, file.name);
    } else if (file.sizeBytes > maxDocumentMb * _mb) {
      problem = DocumentProblem(DocumentProblemReason.size, file.name);
    } else if (totalBytes + file.sizeBytes > maxTotalDocumentsMb * _mb) {
      problem = DocumentProblem(DocumentProblemReason.total, file.name);
    } else {
      accepted.add(file);
      totalBytes += file.sizeBytes;
    }
  }
  return (accepted: accepted, problem: problem);
}
