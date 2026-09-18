import { supabase } from "./client";

const BUCKET = "incident-media";

export async function uploadIncidentMedia(incidentId: number, fileName: string, blob: Blob): Promise<string> {
  const path = `incidents/${incidentId}/${fileName}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}