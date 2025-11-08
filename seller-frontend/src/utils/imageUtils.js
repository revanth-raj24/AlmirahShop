/**
 * Resolves product image URL to absolute URL
 * Handles relative paths, absolute URLs, /images paths (public folder), and /uploads paths
 * Images are served by the backend from boltfrontend/public/images
 */
export function resolveImageUrl(imageUrl, fallback = null) {
  if (!imageUrl) return fallback;
  
  // If already absolute URL, return as is
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }
  
  // If starts with /images, make it absolute (backend serves images)
  if (imageUrl.startsWith("/images")) {
    return `http://127.0.0.1:8000${imageUrl}`;
  }
  
  // If starts with /uploads, make it absolute (backend served)
  if (imageUrl.startsWith("/uploads")) {
    return `http://127.0.0.1:8000${imageUrl}`;
  }
  
  // Otherwise, assume it's a filename - point to backend's /images endpoint
  const cleanFilename = imageUrl.replace(/^\/+/, "");
  // Check if it looks like it's in the images folder
  if (cleanFilename.includes('/')) {
    // Has path, return as is but make absolute
    const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    return `http://127.0.0.1:8000${path.startsWith('/images') ? path : `/images${path}`}`;
  }
  // Just a filename, assume it's in /images (backend serves from boltfrontend/public/images)
  return `http://127.0.0.1:8000/images/${cleanFilename}`;
}

