const db = require('../../../db');
const factionWarModel = require('../../../models/factionWar');

// Mock the database module
// The db module is a knex instance: it is called as a function — db('table') —
// and returns a chainable query builder. The mock must be callable, not a plain object.
jest.mock('../../../db', () => {
  const db = jest.fn(() => db);
  db.where = jest.fn().mockReturnThis();
  db.select = jest.fn().mockReturnThis();
  db.first = jest.fn().mockReturnThis();
  db.insert = jest.fn().mockReturnThis();
  db.update = jest.fn().mockReturnThis();
  db.returning = jest.fn().mockReturnThis();
  db.del = jest.fn().mockReturnThis();
  db.delete = jest.fn().mockReturnThis();
  return db;
});

// The faction_wars table is keyed by the composite (faction_id, opponent_id) — see
// db/migrations/20231101000000_create_initial_tables.js — so the model is opponent-keyed.
describe('FactionWar Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFactionWarByOpponent', () => {
    it('should call the database with the composite key', async () => {
      const mockWar = { faction_id: 50737, opponent_id: 1000, status: 'active' };

      db.where.mockReturnValue({
        first: jest.fn().mockResolvedValue(mockWar)
      });

      const result = await factionWarModel.getFactionWarByOpponent(50737, 1000);

      expect(db).toHaveBeenCalledWith('faction_wars');
      expect(db.where).toHaveBeenCalledWith({ faction_id: 50737, opponent_id: 1000 });
      expect(result).toEqual(mockWar);
    });

    it('should return null when no war is found', async () => {
      db.where.mockReturnValue({
        first: jest.fn().mockResolvedValue(undefined)
      });

      const result = await factionWarModel.getFactionWarByOpponent(50737, 9999);

      expect(result).toBeNull();
    });
  });

  describe('createFactionWar', () => {
    it('should insert a war and return the new record', async () => {
      const warData = {
        faction_id: 50737,
        opponent_id: 1000,
        opponent_name: 'Rivals',
        faction_score: 10,
        opponent_score: 5,
        status: 'active'
      };

      db.insert.mockReturnValue({
        returning: jest.fn().mockResolvedValue([warData])
      });

      const result = await factionWarModel.createFactionWar(warData);

      expect(db).toHaveBeenCalledWith('faction_wars');
      expect(db.insert).toHaveBeenCalledWith(expect.objectContaining({
        faction_id: 50737,
        opponent_id: 1000,
        opponent_name: 'Rivals',
        status: 'active'
      }));
      expect(result).toEqual(warData);
    });
  });

  describe('updateFactionWar', () => {
    it('should update a war and return the updated record', async () => {
      const warData = { faction_score: 20, opponent_score: 8 };
      const updatedWar = { faction_id: 50737, opponent_id: 1000, ...warData };

      db.where.mockReturnValue({
        update: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([updatedWar])
        })
      });

      const result = await factionWarModel.updateFactionWar(50737, 1000, warData);

      expect(db).toHaveBeenCalledWith('faction_wars');
      expect(db.where).toHaveBeenCalledWith({ faction_id: 50737, opponent_id: 1000 });
      expect(result).toEqual(updatedWar);
    });
  });

  describe('upsertFactionWar', () => {
    it('should update when the war exists', async () => {
      const warData = { faction_id: 50737, opponent_id: 1000, faction_score: 20 };
      const updatedWar = { ...warData, status: 'active' };

      jest.spyOn(factionWarModel, 'getFactionWarByOpponent').mockResolvedValue({ faction_id: 50737, opponent_id: 1000 });
      jest.spyOn(factionWarModel, 'updateFactionWar').mockResolvedValue(updatedWar);

      const result = await factionWarModel.upsertFactionWar(warData);

      expect(factionWarModel.getFactionWarByOpponent).toHaveBeenCalledWith(50737, 1000);
      expect(factionWarModel.updateFactionWar).toHaveBeenCalledWith(50737, 1000, warData);
      expect(result).toEqual(updatedWar);
    });

    it('should create when the war does not exist', async () => {
      const warData = { faction_id: 50737, opponent_id: 2000, faction_score: 0 };
      const newWar = { ...warData, status: 'active' };

      jest.spyOn(factionWarModel, 'getFactionWarByOpponent').mockResolvedValue(null);
      jest.spyOn(factionWarModel, 'createFactionWar').mockResolvedValue(newWar);

      const result = await factionWarModel.upsertFactionWar(warData);

      expect(factionWarModel.getFactionWarByOpponent).toHaveBeenCalledWith(50737, 2000);
      expect(factionWarModel.createFactionWar).toHaveBeenCalledWith(warData);
      expect(result).toEqual(newWar);
    });
  });
});
