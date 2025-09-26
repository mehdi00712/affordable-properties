// Replace these:
const CLOUD_NAME = "YOUR_CLOUD_NAME";
const UPLOAD_PRESET = "YOUR_UNSIGNED_UPLOAD_PRESET";
const FOLDER = "affordable-properties";

export async function uploadFilesToCloudinary(files) {
  const urls = [];
  for (const file of files) {
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', UPLOAD_PRESET);
    form.append('folder', FOLDER);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method:'POST', body:form });
    if (!res.ok) throw new Error('Cloudinary upload failed');
    const data = await res.json();
    urls.push(data.secure_url);
  }
  return urls;
}
