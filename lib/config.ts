// API Key Configuration
// API Key Configuration
// @ts-ignore
export const MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
// @ts-ignore
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Backward compatibility (deprecated)
export const API_KEY = MAPS_API_KEY;