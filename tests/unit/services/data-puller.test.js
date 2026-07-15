/**
 * Tests for the data puller service.
 *
 * This service periodically fetches data from the Torn API and stores it in the
 * database. We exercise the real pull* functions and mock only their
 * dependencies: the Torn API client and the models it writes through.
 */

// Mock the Torn API client's helper functions used by the puller.
jest.mock('../../../services/torn-api/client', () => ({
  getUserData: jest.fn(),
  getFactionData: jest.fn(),
  getWarOpponents: jest.fn()
}));

// Mock the models the puller writes through.
jest.mock('../../../models/user');
jest.mock('../../../models/faction');
jest.mock('../../../models/factionWar');

const tornApiClient = require('../../../services/torn-api/client');
const userModel = require('../../../models/user');
const factionModel = require('../../../models/faction');
const factionWarModel = require('../../../models/factionWar');
const dataPuller = require('../../../services/data-puller');

describe('Data Puller Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Ensure no interval timers leak between tests.
    dataPuller.stopPulling();
  });

  describe('pullUserData', () => {
    it('should fetch user data and upsert it', async () => {
      tornApiClient.getUserData.mockResolvedValue({ player_id: 123, name: 'Tester' });
      userModel.upsertUser.mockResolvedValue({ id: 123, name: 'Tester' });

      const result = await dataPuller.pullUserData('api-key');

      expect(tornApiClient.getUserData).toHaveBeenCalledWith('api-key');
      expect(userModel.upsertUser).toHaveBeenCalledWith(expect.objectContaining({ id: 123, name: 'Tester' }));
      expect(result).toEqual([{ id: 123, name: 'Tester' }]);
    });

    it('should throw on invalid user data', async () => {
      tornApiClient.getUserData.mockResolvedValue({});
      await expect(dataPuller.pullUserData('api-key')).rejects.toThrow('Invalid user data');
      expect(userModel.upsertUser).not.toHaveBeenCalled();
    });
  });

  describe('pullFactionData', () => {
    it('should resolve the faction from the user then upsert it', async () => {
      tornApiClient.getUserData.mockResolvedValue({ player_id: 123, faction: { faction_id: 500 } });
      tornApiClient.getFactionData.mockResolvedValue({ name: 'Faction', tag: 'FAC', members: { a: {}, b: {} } });
      factionModel.upsertFaction.mockResolvedValue({ id: 500, name: 'Faction' });

      const result = await dataPuller.pullFactionData('api-key');

      expect(tornApiClient.getUserData).toHaveBeenCalledWith('api-key');
      expect(tornApiClient.getFactionData).toHaveBeenCalledWith('api-key', 500);
      expect(factionModel.upsertFaction).toHaveBeenCalledWith(expect.objectContaining({ id: 500, member_count: 2 }));
      expect(result).toEqual([{ id: 500, name: 'Faction' }]);
    });

    it('should throw when the user is not in a faction', async () => {
      tornApiClient.getUserData.mockResolvedValue({ player_id: 123 });
      await expect(dataPuller.pullFactionData('api-key')).rejects.toThrow('not in a faction');
      expect(tornApiClient.getFactionData).not.toHaveBeenCalled();
    });
  });

  describe('pullWarData', () => {
    it('should fetch war opponents and upsert each war', async () => {
      tornApiClient.getUserData.mockResolvedValue({ player_id: 123, faction: { faction_id: 500 } });
      tornApiClient.getWarOpponents.mockResolvedValue([
        {
          faction_id: 900,
          name: 'Rivals',
          war: { started: 1, ends: 2, score: { '500': 10, '900': 5 }, status: 'active' }
        }
      ]);
      factionWarModel.upsertFactionWar.mockResolvedValue({ faction_id: 500, opponent_id: 900 });

      const result = await dataPuller.pullWarData('api-key');

      expect(tornApiClient.getWarOpponents).toHaveBeenCalledWith('api-key', 500);
      expect(factionWarModel.upsertFactionWar).toHaveBeenCalledWith(expect.objectContaining({
        faction_id: 500,
        opponent_id: 900,
        opponent_name: 'Rivals'
      }));
      expect(result).toHaveLength(1);
    });

    it('should throw on invalid war data', async () => {
      tornApiClient.getUserData.mockResolvedValue({ player_id: 123, faction: { faction_id: 500 } });
      tornApiClient.getWarOpponents.mockResolvedValue(null);
      await expect(dataPuller.pullWarData('api-key')).rejects.toThrow('Invalid war data');
    });
  });

  describe('startPulling', () => {
    it('should require an API key', () => {
      expect(() => dataPuller.startPulling()).toThrow('API key is required');
    });

    it('should mark the puller as running, then stop', () => {
      jest.useFakeTimers();
      tornApiClient.getUserData.mockResolvedValue({ player_id: 123, faction: { faction_id: 500 } });
      tornApiClient.getFactionData.mockResolvedValue({ name: 'F', members: {} });
      tornApiClient.getWarOpponents.mockResolvedValue([]);
      userModel.upsertUser.mockResolvedValue({ id: 123 });
      factionModel.upsertFaction.mockResolvedValue({ id: 500 });

      dataPuller.startPulling('api-key');
      expect(dataPuller.getStatus().running).toBe(true);

      dataPuller.stopPulling();
      expect(dataPuller.getStatus().running).toBe(false);
      jest.useRealTimers();
    });
  });

  describe('getStatus', () => {
    it('should return a status object with lastRun and errors', () => {
      const status = dataPuller.getStatus();
      expect(status).toHaveProperty('running');
      expect(status).toHaveProperty('lastRun');
      expect(status).toHaveProperty('errors');
    });
  });
});
