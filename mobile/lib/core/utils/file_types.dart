/// Extensions the backend accepts for evidence and application documents
/// (mirrors its storage allow-list).
const allowedUploadExtensions = {
  'jpg', 'jpeg', 'png', 'webp', //
  'mp4', 'webm', 'mov',
  'mp3', 'wav', 'm4a', 'ogg',
  'pdf', 'doc', 'docx',
};

const imageExtensions = {'jpg', 'jpeg', 'png', 'webp'};
const videoExtensions = {'mp4', 'webm', 'mov'};

String extensionOf(String path) {
  final dot = path.lastIndexOf('.');
  return dot < 0 ? '' : path.substring(dot + 1).toLowerCase();
}

bool isAllowedUpload(String path) =>
    allowedUploadExtensions.contains(extensionOf(path));

String contentTypeFor(String extension) => switch (extension) {
  'jpg' || 'jpeg' => 'image/jpeg',
  'png' => 'image/png',
  'webp' => 'image/webp',
  'mp4' => 'video/mp4',
  'webm' => 'video/webm',
  'mov' => 'video/quicktime',
  'mp3' => 'audio/mpeg',
  'wav' => 'audio/wav',
  'm4a' => 'audio/mp4',
  'ogg' => 'audio/ogg',
  'pdf' => 'application/pdf',
  'doc' => 'application/msword',
  'docx' =>
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  _ => 'application/octet-stream',
};
