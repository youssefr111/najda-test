export async function uploadToSignedUrl(
  uploadUrl: string,
  file: File | Blob,
  contentType?: string
): Promise<void> {

  try {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType || file.type || "application/octet-stream",
      },
      body: file,
    });

    const responseBody = await response.text();

    if (!response.ok) {
      throw new Error(
        `Upload to storage failed: HTTP ${response.status} - ${responseBody}`
      );
    }

  } catch (error) {
    throw error;
  }
}