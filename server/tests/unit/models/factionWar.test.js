const db = require('../../../db');
const factionWarModel = require('../../../models/factionWar');

// Mock the database module
jest.mock('../../../db', () => ({
  where: jest.fn().mockReturnThis(),
  first: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  returning: jest.fn().mockReturnThis()
}));

describe('FactionWar Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFactionWarById', () => {
    it('should call the database with correct parameters', async () => {
      const mockWar = { 
        war_id: 12345, 
        start: new Date(), 
        end: new Date(), 
        target: 1000, 
        winner: 50737 
      };
      
      db.where.mockReturnValue({
        first: jest.fn().mockResolvedValue(mockWar)
      });

      const result = await factionWarModel.getFactionWarById(12345);
      
      expect(db).toHaveBeenCalledWith('faction_wars');
      expect(db.where).toHaveBeenCalledWith({ war_id: 12345 });
      expect(result).toEqual(mockWar);
    });
  });

  describe('createFactionWar', () => {
    it('should insert a war and return the new record', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const warData = { 
        war_id: 12345, 
        start: timestamp, 
        end: timestamp + 86400, // 1 day later
        target: 1000, 
        winner: 50737 
      };
      
      const expectedRecord = {
        war_id: 12345,
        start: new Date(timestamp * 1000),
        end: new Date((timestamp + 86400) * 1000),
        target: 1000,
        winner: 50737,
        raw_data: JSON.stringify(warData)
      };
      
      db.insert.mockReturnValue({
        returning: jest.fn().mockResolvedValue([expectedRecord])
      });

      const result = await factionWarModel.createFactionWar(warData);
      
      expect(db).toHaveBeenCalledWith('faction_wars');
      expect(db.insert).toHaveBeenCalledWith(expect.objectContaining({
        war_id: 12345,
        start: expect.any(Date),
        end: expect.any(Date),
        target: 1000,
        winner: 50737
      }));
      expect(result).toEqual(expectedRecord);
    });
  });

  describe('updateFactionWar', () => {
    it('should update a war and return the updated record', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const warId = 12345;
      const warData = { 
        start: timestamp, 
        end: timestamp + 86400, 
        target: 1000, 
        winner: 50737 
      };
      
      const updatedWar = {
        war_id: warId,
        start: new Date(timestamp * 1000),
        end: new Date((timestamp + 86400) * 1000),
        target: 1000,
        winner: 50737,
        raw_data: JSON.stringify(warData)
      };
      
      db.where.mockReturnValue({
        update: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([updatedWar])
        })
      });

      const result = await factionWarModel.updateFactionWar(warId, warData);
      
      expect(db).toHaveBeenCalledWith('faction_wars');
      expect(db.where).toHaveBeenCalledWith({ war_id: warId });
      expect(result).toEqual(updatedWar);
    });
  });

  describe('upsertFactionWar', () => {
    it('should update when war exists', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const warData = { 
        war_id: 12345, 
        start: timestamp, 
        end: timestamp + 86400, 
        target: 1000, 
        winner: 50737 
      };
      
      const updatedWar = {
        war_id: 12345,
        start: new Date(timestamp * 1000),
        end: new Date((timestamp + 86400) * 1000),
        target: 1000,
        winner: 50737,
        raw_data: JSON.stringify(warData)
      };
      
      // Mock getFactionWarById to return an existing war
      jest.spyOn(factionWarModel, 'getFactionWarById').mockResolvedValue({ war_id: 12345 });
      
      // Mock updateFactionWar
      jest.spyOn(factionWarModel, 'updateFactionWar').mockResolvedValue(updatedWar);

      const result = await factionWarModel.upsertFactionWar(warData);
      
      expect(factionWarModel.getFactionWarById).toHaveBeenCalledWith(12345);
      expect(factionWarModel.updateFactionWar).toHaveBeenCalledWith(12345, warData);
      expect(result).toEqual(updatedWar);
    });

    it('should create when war does not exist', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const warData = { 
        war_id: 67890, 
        start: timestamp, 
        end: timestamp + 86400, 
        target: 1000, 
        winner: 50737 
      };
      
      const newWar = {
        war_id: 67890,
        start: new Date(timestamp * 1000),
        end: new Date((timestamp + 86400) * 1000),
        target: 1000,
        winner: 50737,
        raw_data: JSON.stringify(warData)
      };
      
      // Mock getFactionWarById to return null (war doesn't exist)
      jest.spyOn(factionWarModel, 'getFactionWarById').mockResolvedValue(null);
      
      // Mock createFactionWar
      jest.spyOn(factionWarModel, 'createFactionWar').mockResolvedValue(newWar);

      const result = await factionWarModel.upsertFactionWar(warData);
      
      expect(factionWarModel.getFactionWarById).toHaveBeenCalledWith(67890);
      expect(factionWarModel.createFactionWar).toHaveBeenCalledWith(warData);
      expect(result).toEqual(newWar);
    });
  });
}); 