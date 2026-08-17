/**
 * ==========================================================================
 * DATA SERVICE
 *
 * Every read and write in the app goes through this object. Nothing else
 * touches localStorage, and nothing else will touch Supabase later — which
 * means swapping backends is a one-file job.
 *
 * All methods are async and resolve to a full snapshot: { stars, friends }.
 * Components call a method, then hand the snapshot to state. That's the whole
 * contract.
 *
 * --- Moving to Supabase ---------------------------------------------------
 * Create two tables and one join:
 *
 *   stars(id uuid pk, jar_id text, text text, occurred_on date,
 *         created_at timestamptz, color text, author_id uuid,
 *         opened bool, copied_from uuid)
 *   friends(id uuid pk, name text, kind text, color text)
 *   star_recipients(star_id uuid, recipient_id uuid)   -- for groups
 *
 * Media files go to Supabase Storage; keep the same { id, type, url } shape
 * and store the public URL. Then write createSupabaseStarService() below with
 * the same method names and change the one export at the bottom.
 * ==========================================================================
 */

import { MOCK_FRIENDS, MOCK_STARS, MOCK_USER } from '../data/mockData.js';

const STORAGE_KEY = 'lucky-star-catcher/v1';

const uid = (prefix = 's') =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** Pretend the network took a moment, so loading states are real. */
const tick = (ms = 90) => new Promise((r) => setTimeout(r, ms));

function loadFromDisk() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.stars)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveToDisk(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (err) {
    // Quota is the usual culprit — base64 photos are heavy. Supabase Storage
    // solves this properly; until then, warn rather than crash.
    console.warn('Could not save locally. Photos may be too large.', err);
  }
}

export function createLocalStarService() {
  let db = loadFromDisk() || {
    stars: structuredClone(MOCK_STARS),
    friends: structuredClone(MOCK_FRIENDS),
  };

  const snapshot = () => ({
    stars: structuredClone(db.stars),
    friends: structuredClone(db.friends),
  });

  const commit = async () => {
    saveToDisk(db);
    await tick();
    return snapshot();
  };

  const find = (id) => db.stars.find((s) => s.id === id);

  return {
    currentUser: MOCK_USER,

    async load() {
      await tick(140);
      return snapshot();
    },

    /** Fold a new memory into a star and drop it in the main jar. */
    async addStar({ text = '', occurredOn = '', media = [], color }) {
      db.stars.push({
        id: uid(),
        jarId: 'main',
        text: text.trim(),
        occurredOn,
        createdAt: new Date().toISOString(),
        media,
        color,
        authorId: MOCK_USER.id,
        opened: true,
      });
      return commit();
    },

    async updateStar(id, patch) {
      const star = find(id);
      if (star) Object.assign(star, patch);
      return commit();
    },

    async deleteStar(id) {
      db.stars = db.stars.filter((s) => s.id !== id);
      return commit();
    },

    /**
     * Send a copy of a star to friends or groups. The original stays put; the
     * recipient's copy lands in their inbox. (In Supabase this becomes one
     * insert per recipient, or a row in star_recipients.)
     *
     * Because this build is single-device, the copy is written straight into
     * the matching friend jar so you can see both sides of the exchange.
     */
    async sendStar(starId, recipientIds) {
      const original = find(starId);
      if (!original) return snapshot();

      for (const recipientId of recipientIds) {
        db.stars.push({
          ...structuredClone(original),
          id: uid(),
          jarId: `friend:${recipientId}`,
          authorId: MOCK_USER.id,
          opened: true,
          sentAt: new Date().toISOString(),
          copiedFrom: original.id,
        });
      }
      return commit();
    },

    /**
     * Open a star that arrived from someone. It leaves the inbox and settles
     * into that friend's jar, where both of your stars live together.
     */
    async openReceivedStar(starId) {
      const star = find(starId);
      if (!star || star.jarId !== 'inbox') return snapshot();
      star.opened = true;
      star.jarId = `friend:${star.authorId}`;
      return commit();
    },

    /** Keep a received star for yourself. */
    async copyToMainJar(starId) {
      const star = find(starId);
      if (!star) return snapshot();
      db.stars.push({
        ...structuredClone(star),
        id: uid(),
        jarId: 'main',
        opened: true,
        copiedFrom: star.id,
        savedAt: new Date().toISOString(),
      });
      return commit();
    },

    /** Dev helper: pretend a friend just sent you something. */
    async simulateIncoming(friendId, text) {
      const friend = db.friends.find((f) => f.id === friendId) || db.friends[0];
      db.stars.push({
        id: uid(),
        jarId: 'inbox',
        text,
        occurredOn: '',
        createdAt: new Date().toISOString(),
        media: [],
        color: friend.color,
        authorId: friend.id,
        opened: false,
      });
      return commit();
    },

    /** Wipe local data and go back to the seed set. */
    async reset() {
      db = {
        stars: structuredClone(MOCK_STARS),
        friends: structuredClone(MOCK_FRIENDS),
      };
      return commit();
    },
  };
}

export const starService = createLocalStarService();
