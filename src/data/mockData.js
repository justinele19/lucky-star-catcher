/**
 * Seed data used the first time the app runs.
 *
 * When you move to Supabase, this file becomes your fixtures / seed script —
 * the shapes below are the shapes the tables should have.
 */

import { STAR_COLORS } from '../design/tokens.js';

/** Tiny inline placeholder "photos" so the app has no external image deps. */
const swatch = (from, to, label) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
      </linearGradient></defs>
      <rect width="300" height="400" fill="url(#g)"/>
      <text x="150" y="210" font-family="Georgia,serif" font-size="22"
            fill="rgba(255,255,255,.85)" text-anchor="middle">${label}</text>
    </svg>`
  );

export const MOCK_USER = { id: 'me', name: 'You' };

export const MOCK_FRIENDS = [
  { id: 'f_mira', name: 'Mira', kind: 'friend', color: STAR_COLORS[0] },
  { id: 'f_dev', name: 'Dev', kind: 'friend', color: STAR_COLORS[5] },
  {
    id: 'g_roomies',
    name: 'The Roomies',
    kind: 'group',
    color: STAR_COLORS[3],
    members: ['Mira', 'Dev', 'Sam'],
  },
];

/**
 * A star is one memory.
 *
 * id          unique
 * jarId       'main' | 'inbox' | `friend:<friendId>`
 * text        what's written on the paper (may be empty)
 * occurredOn  optional YYYY-MM-DD the memory happened, entered by hand
 * createdAt   ISO timestamp the star was folded
 * media       [{ id, type: 'image' | 'video', url }]
 * color       hex from STAR_COLORS
 * authorId    'me' or a friend id
 * opened      inbox stars start false
 * copiedFrom  set when a received star was copied into the main jar
 */
export const MOCK_STARS = [
  {
    id: 's1',
    jarId: 'main',
    text: 'First real rain of the year. We stood under the awning on Bleecker for twenty minutes and neither of us wanted to run for it.',
    occurredOn: '2026-04-11',
    createdAt: '2026-04-11T22:14:00.000Z',
    media: [],
    color: STAR_COLORS[5],
    authorId: 'me',
    opened: true,
  },
  {
    id: 's2',
    jarId: 'main',
    text: 'Grandma taught me the folding trick — thumb on the crease, pull slow. Took me nine tries.',
    occurredOn: '2026-02-02',
    createdAt: '2026-02-03T09:02:00.000Z',
    media: [{ id: 'm1', type: 'image', url: swatch('#f6b8c8', '#f5d38a', 'photo') }],
    color: STAR_COLORS[0],
    authorId: 'me',
    opened: true,
  },
  {
    id: 's3',
    jarId: 'main',
    text: '',
    occurredOn: '2026-06-21',
    createdAt: '2026-06-22T04:40:00.000Z',
    media: [
      { id: 'm2', type: 'image', url: swatch('#8fd6c6', '#6fb8e8', 'photo') },
      { id: 'm3', type: 'image', url: swatch('#c9b3f2', '#8fa8f0', 'photo') },
    ],
    color: STAR_COLORS[4],
    authorId: 'me',
    opened: true,
  },
  {
    id: 's4',
    jarId: 'main',
    text: 'Got the job. Sat in the car in the parking garage and just breathed for a while.',
    occurredOn: '',
    createdAt: '2026-07-09T17:30:00.000Z',
    media: [],
    color: STAR_COLORS[2],
    authorId: 'me',
    opened: true,
  },
  {
    id: 's5',
    jarId: 'main',
    text: 'Sam burnt the rice again. Third time. We are keeping count now.',
    occurredOn: '2026-05-30',
    createdAt: '2026-05-30T20:11:00.000Z',
    media: [],
    color: STAR_COLORS[3],
    authorId: 'me',
    opened: true,
  },
  {
    id: 's6',
    jarId: 'main',
    text: 'The whole sky went orange at 8:40 and everyone on the block came outside at once.',
    occurredOn: '2026-08-02',
    createdAt: '2026-08-02T20:52:00.000Z',
    media: [{ id: 'm4', type: 'image', url: swatch('#ffb36b', '#ff7f7f', 'photo') }],
    color: STAR_COLORS[1],
    authorId: 'me',
    opened: true,
  },
  {
    id: 's7',
    jarId: 'main',
    text: 'Walked the long way home on purpose.',
    occurredOn: '2026-03-18',
    createdAt: '2026-03-18T23:05:00.000Z',
    media: [],
    color: STAR_COLORS[6],
    authorId: 'me',
    opened: true,
  },

  /* --- Waiting in the inbox, unopened. Each one gets its own shooting star. */
  {
    id: 's8',
    jarId: 'inbox',
    text: "Found the photo booth strip from your birthday in my coat pocket. You're making the face.",
    occurredOn: '2026-01-15',
    createdAt: '2026-08-16T15:20:00.000Z',
    media: [{ id: 'm5', type: 'image', url: swatch('#f2a1c0', '#f7d98b', 'photo') }],
    color: STAR_COLORS[0],
    authorId: 'f_mira',
    opened: false,
  },
  {
    id: 's9',
    jarId: 'inbox',
    text: 'Rice: burnt. Count: four.',
    occurredOn: '',
    createdAt: '2026-08-17T02:05:00.000Z',
    media: [],
    color: STAR_COLORS[3],
    authorId: 'g_roomies',
    opened: false,
  },

  /* --- Already opened, so it lives in Mira's jar. */
  {
    id: 's10',
    jarId: 'friend:f_mira',
    text: 'Ferry at dusk. You said the skyline looked like a barcode.',
    occurredOn: '2026-06-04',
    createdAt: '2026-06-05T01:12:00.000Z',
    media: [],
    color: STAR_COLORS[5],
    authorId: 'f_mira',
    opened: true,
  },
];
