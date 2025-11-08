/**
 * Resolves product image URL to absolute URL
 * Handles relative paths, absolute URLs, /images paths (public folder), and /uploads paths
 */
export function resolveImageUrl(imageUrl, fallback = 'https://via.placeholder.com/400x533?text=Product') {
  if (!imageUrl) return fallback;
  
  // If already absolute URL, return as is
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }
  
  // If starts with /images, return as is (Vite serves public folder at root)
  if (imageUrl.startsWith("/images")) {
    return imageUrl;
  }
  
  // If starts with /uploads, make it absolute (backend served)
  if (imageUrl.startsWith("/uploads")) {
    return `http://127.0.0.1:8000${imageUrl}`;
  }
  
  // Otherwise, assume it's a filename - try /images first (public folder), then /uploads (backend)
  const cleanFilename = imageUrl.replace(/^\/+/, "");
  // Check if it looks like it's in the images folder
  if (cleanFilename.includes('/')) {
    // Has path, return as is
    return imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  }
  // Just a filename, assume it's in /images (public folder)
  return `/images/${cleanFilename}`;
}

