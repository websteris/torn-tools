'use strict';

// Per-route request schemas (#38), consumed by middleware/validate.js. z.coerce.*
// parses the string params/query express hands over before checking type/range, so
// `?limit=abc` and `:id=xyz` fail validation instead of becoming NaN downstream.

const { z } = require('zod');

const positiveInt = z.coerce.number().int().positive();
const WAR_TYPES = ['territory', 'raid', 'ranked'];

// Data selections that may be forwarded toward the Torn API — an allowlist so an
// arbitrary caller-supplied selection can't be proxied through.
const DATA_SELECTIONS = [
  'profile', 'bars', 'cooldowns', 'travel', 'events', 'personalstats',
  'money', 'networth', 'basic', 'stats', 'items',
];

// Torn API keys are 16-char alphanumeric.
const TORN_KEY = /^[A-Za-z0-9]{16}$/;

const schemas = {
  // --- faction-tracker ---------------------------------------------------
  factionIdParam: z.object({ factionId: positiveInt }),
  warTypeParams: z.object({ factionId: positiveInt, warType: z.enum(WAR_TYPES) }),
  warIdTypeParams: z.object({ warId: positiveInt, warType: z.enum(WAR_TYPES) }),
  trackBody: z.object({
    factionId: positiveInt,
    targetFactionId: positiveInt.optional(),
    pollingInterval: z.coerce.number().int().min(30_000).optional(), // ms; >= 30s
  }),
  stopBody: z.object({ factionId: positiveInt }),
  historyQuery: z.object({ limit: z.coerce.number().int().min(1).max(100).optional() }),

  // --- data --------------------------------------------------------------
  dataQuery: z.object({
    selections: z.string().optional().refine(
      (v) => v === undefined || v.split(',').every((s) => DATA_SELECTIONS.includes(s.trim())),
      { message: 'contains an unknown selection' },
    ),
    bypass: z.enum(['true', 'false']).optional(),
  }),

  // --- api-keys ----------------------------------------------------------
  idParam: z.object({ id: positiveInt }),
  apiKeyCreateBody: z.object({
    key_name: z.string().min(1).max(100),
    key_value: z.string().regex(TORN_KEY, 'must be a 16-character alphanumeric Torn API key'),
    active: z.boolean().optional(),
  }),
  apiKeyUpdateBody: z.object({
    key_name: z.string().min(1).max(100).optional(),
    key_value: z.string().regex(TORN_KEY, 'must be a 16-character alphanumeric Torn API key').optional(),
    active: z.boolean().optional(),
  }),

  // --- auth (username/password, per #36) ---------------------------------
  registerBody: z.object({
    username: z.string().min(1).max(100),
    password: z.string().min(1),
    player_id: positiveInt.optional(),
    name: z.string().max(100).optional(),
  }),
  loginBody: z.object({
    username: z.string().min(1).max(100),
    password: z.string().min(1),
  }),
};

module.exports = { schemas, DATA_SELECTIONS, WAR_TYPES };
