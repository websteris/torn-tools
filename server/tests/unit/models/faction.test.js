const db = require('../../../db');
const factionModel = require('../../../models/faction');

// Mock the database module
jest.mock('../../../db', () => ({
  where: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  first: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  returning: jest.fn().mockReturnThis()
}));

describe('Faction Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFactionById', () => {
    it('should call the database with correct parameters', async () => {
      db.where.mockReturnValue({
        first: jest.fn().mockResolvedValue({ id: 123, name: 'Test Faction' })
      });

      const result = await factionModel.getFactionById(123);
      
      expect(db).toHaveBeenCalledWith('factions');
      expect(db.where).toHaveBeenCalledWith({ id: 123 });
      expect(result).toEqual({ id: 123, name: 'Test Faction' });
    });
  });

  describe('getAllFactions', () => {
    it('should return all factions', async () => {
      const mockFactions = [
        { id: 123, name: 'Faction 1' },
        { id: 456, name: 'Faction 2' }
      ];
      
      db.select.mockResolvedValue(mockFactions);

      const result = await factionModel.getAllFactions();
      
      expect(db).toHaveBeenCalledWith('factions');
      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual(mockFactions);
    });
  });

  describe('createFaction', () => {
    it('should insert a faction and return the new record', async () => {
      const factionData = { id: 123, name: 'New Faction' };
      
      db.insert.mockReturnValue({
        returning: jest.fn().mockResolvedValue([factionData])
      });

      const result = await factionModel.createFaction(factionData);
      
      expect(db).toHaveBeenCalledWith('factions');
      expect(db.insert).toHaveBeenCalledWith(factionData);
      expect(result).toEqual(factionData);
    });
  });

  describe('updateFaction', () => {
    it('should update a faction and return the updated record', async () => {
      const factionId = 123;
      const factionData = { name: 'Updated Faction' };
      const updatedFaction = { id: factionId, ...factionData };
      
      db.where.mockReturnValue({
        update: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([updatedFaction])
        })
      });

      const result = await factionModel.updateFaction(factionId, factionData);
      
      expect(db).toHaveBeenCalledWith('factions');
      expect(db.where).toHaveBeenCalledWith({ id: factionId });
      expect(result).toEqual(updatedFaction);
    });
  });

  describe('upsertFaction', () => {
    it('should update when faction exists', async () => {
      const factionData = { id: 123, name: 'Existing Faction' };
      
      // Mock getFactionById to return an existing faction
      jest.spyOn(factionModel, 'getFactionById').mockResolvedValue({ id: 123 });
      
      // Mock updateFaction
      jest.spyOn(factionModel, 'updateFaction').mockResolvedValue(factionData);

      const result = await factionModel.upsertFaction(factionData);
      
      expect(factionModel.getFactionById).toHaveBeenCalledWith(123);
      expect(factionModel.updateFaction).toHaveBeenCalledWith(123, factionData);
      expect(result).toEqual(factionData);
    });

    it('should create when faction does not exist', async () => {
      const factionData = { id: 456, name: 'New Faction' };
      
      // Mock getFactionById to return null (faction doesn't exist)
      jest.spyOn(factionModel, 'getFactionById').mockResolvedValue(null);
      
      // Mock createFaction
      jest.spyOn(factionModel, 'createFaction').mockResolvedValue(factionData);

      const result = await factionModel.upsertFaction(factionData);
      
      expect(factionModel.getFactionById).toHaveBeenCalledWith(456);
      expect(factionModel.createFaction).toHaveBeenCalledWith(factionData);
      expect(result).toEqual(factionData);
    });
  });
}); 