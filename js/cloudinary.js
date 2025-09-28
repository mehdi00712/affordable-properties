// Cloudinary direct uploads
const CLOUD_NAME = "drenxmgtg";
const UPLOAD_PRESET = "etoile";
const FOLDER = "etoile-property";

export function cloudinaryReady(){ return Boolean(CLOUD_NAME && UPLOAD_PRESET); }

export async function uploadFilesToCloudinary(files){
  if (!files?.length) return [];
  if (!cloudinaryReady()) { console.warn("Cloudinary not configured. Submitting without images."); return []; }
  const urls=[];
  for (const file of files){
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', UPLOAD_PRESET);
    form.append('folder', FOLDER);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method:'POST', body: form });
    if (!res.ok){ const t = await res.text(); throw new Error(`Cloudinary upload failed (${res.status}): ${t.slice(0,180)}`); }
    const data = await res.json();
    urls.push(data.secure_url);
  }
  return urls;
}
