/**
 * Mobile recommendation service.
 *
 * Ranking happens on the server (`GET /api/properties/recommended`), which
 * scores content similarity, popularity and freshness, then applies an MMR
 * diversity pass. This module deliberately does NOT re-implement any of that:
 *
 *   - the client only ever sees one page of properties, so it cannot rank the
 *     catalogue it does not have;
 *   - the server sees favorites, inquiries and cross-device view history that
 *     the device does not;
 *   - two independent scoring implementations drift, and the app would quietly
 *     disagree with the web build about what "recommended" means.
 *
 * Personalization works for logged-OUT users too: `services/api.js` mints a
 * persistent `X-Visitor-Id` and sends it on every request, so view telemetry
 * and the recommendation read resolve to the same anonymous visitor.
 *
 * Local storage is kept only as an offline convenience (recently-viewed list),
 * never as a ranking input.
 */

import api, { endpoints } from './api';

// Cross-platform storage helpers – fall back to in-memory store on native
const isWebStorageAvailable = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const memoryStore = {};

const safeStorage = {
  getItem: (key) => {
    if (isWebStorageAvailable()) {
      try {
        return window.localStorage.getItem(key);
      } catch (_) {
        return null;
      }
    }
    return memoryStore[key] ?? null;
  },
  setItem: (key, value) => {
    if (isWebStorageAvailable()) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch (_) {/* ignore */}
    }
    memoryStore[key] = value;
  },
  removeItem: (key) => {
    if (isWebStorageAvailable()) {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch (_) {/* ignore */}
    }
    delete memoryStore[key];
  }
};

const USER_PREFERENCES_KEY = 'user_property_preferences';
const VIEWED_PROPERTIES_KEY = 'user_viewed_properties';
const MAX_STORED_VIEWS = 20;

// ---------------------------------------------------------------------------
// Signal capture
// ---------------------------------------------------------------------------

/**
 * Persist the filters a user applied.
 *
 * Local-only for now: the backend builds its profile from views, favorites and
 * inquiries. Kept so the filter sheet can prefill, and so this signal is
 * already being captured if a `/events` endpoint is added later.
 */
export const storeUserPreferences = (filters) => {
  try {
    const cleanFilters = Object.entries(filters || {})
      .filter(([, value]) => value !== '' && value !== null && value !== undefined)
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});

    if (Object.keys(cleanFilters).length === 0) return;

    const existing = JSON.parse(safeStorage.getItem(USER_PREFERENCES_KEY) || '[]');
    const updated = [{ ...cleanFilters, timestamp: Date.now() }, ...existing].slice(0, 10);
    safeStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error storing user preferences:', error);
  }
};

// Property ids already reported during this app session. The backend also
// dedups per visitor per UTC day; this just avoids redundant requests when a
// detail screen remounts or serves from cache.
const reportedViews = new Set();

/**
 * Record that the user opened a listing.
 *
 * This is the signal the server-side taste profile is built from — the local
 * copy alone cannot personalize anything, because ranking runs on the server.
 * Best-effort: failures never surface to the UI, and the id is released so a
 * later screen visit retries.
 */
export const storeViewedProperty = async (property) => {
  const propertyId = property?.id || property?._id;
  if (!property || !propertyId) return;

  try {
    const viewedProperties = JSON.parse(safeStorage.getItem(VIEWED_PROPERTIES_KEY) || '[]');

    const existingIndex = viewedProperties.findIndex((p) => p.id === propertyId);
    if (existingIndex !== -1) viewedProperties.splice(existingIndex, 1);

    const entry = {
      id: propertyId,
      property_type: property.property_type,
      price: property.price,
      governate: property.governate,
      city: property.city,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      area: property.area,
      timestamp: Date.now()
    };

    const updated = [entry, ...viewedProperties].slice(0, MAX_STORED_VIEWS);
    safeStorage.setItem(VIEWED_PROPERTIES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error storing viewed property:', error);
  }

  if (reportedViews.has(propertyId)) return;
  reportedViews.add(propertyId);

  try {
    // Goes to the public `/properties/:id/views` route and carries the
    // X-Visitor-Id header, so guests build a profile too.
    await endpoints.propertyViews.recordView(propertyId);
    // A new view changes the ranking; drop the local cache so the next home
    // screen render reflects it (the server invalidates its own cache too).
    clearRecommendationCache();
  } catch (error) {
    reportedViews.delete(propertyId);
    console.warn('Failed to record property view:', error?.message || error);
  }
};

/** Recently-viewed list for offline display. Not a ranking input. */
export const getViewedProperties = () => {
  try {
    return JSON.parse(safeStorage.getItem(VIEWED_PROPERTIES_KEY) || '[]');
  } catch (_) {
    return [];
  }
};

// ---------------------------------------------------------------------------
// Recommendation read
// ---------------------------------------------------------------------------

// Short client cache on top of the server's own 45s cache: avoids a network
// round trip when the home screen remounts on tab switches.
const REC_CACHE_DURATION = 60 * 1000;
const recCache = new Map();
const pendingRecPromises = new Map();

const cacheKey = (userId, limit) => `${userId || 'guest'}_${limit}`;

export const clearRecommendationCache = () => {
  recCache.clear();
  pendingRecPromises.clear();
};

/**
 * Fetch server-ranked recommendations.
 *
 * @param {?string} userId  used only to drop the user's own listings and to key
 *                          the cache — identity comes from the auth header and
 *                          X-Visitor-Id, never from a client-supplied id.
 * @param {number}  limit
 * @returns {Promise<Array>} properties, with a non-enumerable-ish `source`
 *                           property attached for the UI label
 *                           (`personalized` | `trending` | `curated`).
 */
export const getRecommendedProperties = async (userId = null, limit = 10) => {
  const key = cacheKey(userId, limit);

  const cached = recCache.get(key);
  if (cached && Date.now() - cached.timestamp < REC_CACHE_DURATION) {
    return cached.data;
  }

  if (pendingRecPromises.has(key)) {
    return pendingRecPromises.get(key);
  }

  const fetchPromise = (async () => {
    try {
      const response = await api.get('/properties/recommended', {
        params: { limit },
        validateStatus: (status) => status === 200 || status === 401
      });

      const payload = response?.data;
      const list = Array.isArray(payload?.data) ? payload.data : [];

      // Never recommend a user their own listing. The server already excludes
      // them; this is belt-and-braces for cached responses.
      const filtered = userId ? list.filter((p) => p?.profiles_id !== userId) : list;

      // Guard against duplicate React keys.
      const deduped = [...new Map(filtered.map((p) => [p.id, p])).values()];

      deduped.source = payload?.source || 'trending';
      deduped.personalized = Boolean(payload?.personalized);

      recCache.set(key, { data: deduped, timestamp: Date.now() });
      return deduped;
    } catch (error) {
      console.error('Error getting recommended properties:', error);
      const empty = [];
      empty.source = 'unavailable';
      empty.personalized = false;
      return empty;
    }
  })();

  pendingRecPromises.set(key, fetchPromise);

  try {
    return await fetchPromise;
  } finally {
    pendingRecPromises.delete(key);
  }
};
