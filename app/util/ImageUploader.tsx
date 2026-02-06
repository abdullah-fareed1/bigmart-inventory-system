
// /**
//  * Upload an image to Cloudinary
//  * @param {File} file - The image file (from <input type="file" />)
//  * @returns {Promise<string>} - The secure URL of the uploaded image
//  */
// export async function uploadImage(file) {
//   console.log("uploadImage called with file:", file);

//   if (!file) throw new Error("No file provided");

//   const cloudName = import.meta.env.CLOUDINARY_CLOUD_NAME;
//   const uploadPreset = import.meta.env.CLOUDINARY_UPLOAD_PRESET;

//   console.log("Cloudinary config:", { cloudName, uploadPreset });

//   if (!cloudName || !uploadPreset) {
//     throw new Error("Missing Cloudinary environment variables");
//   }

//   const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
//   const formData = new FormData();
//   formData.append("file", file);
//   formData.append("upload_preset", uploadPreset);

//   try {
//     console.log("Sending request to Cloudinary...");
//     const res = await fetch(url, { method: "POST", body: formData });
//     console.log("Cloudinary response status:", res.status);

//     if (!res.ok) {
//       const text = await res.text();
//       console.error("Cloudinary response not OK:", text);
//       throw new Error("Cloudinary upload failed");
//     }

//     const data = await res.json();
//     console.log("Cloudinary upload successful:", data);
//     return data.secure_url;
//   } catch (err) {
//     console.error("Cloudinary Upload Error:", err);
//     throw err;
//   }
// }
