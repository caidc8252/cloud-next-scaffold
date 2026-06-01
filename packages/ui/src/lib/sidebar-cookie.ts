// Shared cookie name. Lives in a non-client module so the server layout can
// read the real string (a constant imported from a 'use client' module would
// resolve to a client reference instead).
export const SIDEBAR_COOKIE = "sidebar_collapsed"
