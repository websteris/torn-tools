const db = require('../../../db');
const userDetailModel = require('../../../models/userDetail');

// Mock the database module
jest.mock('../../../db', () => ({
  where: jest.fn().mockReturnThis(),
  first: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  returning: jest.fn().mockReturnThis()
}));

describe('UserDetail Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserDetailById', () => {
    it('should call the database with correct parameters', async () => {
      const mockUser = { player_id: 123, name: 'TestUser', raw_data: '{"player_id":123,"name":"TestUser"}' };
      
      db.where.mockReturnValue({
        first: jest.fn().mockResolvedValue(mockUser)
      });

      const result = await userDetailModel.getUserDetailById(123);
      
      expect(db).toHaveBeenCalledWith('users');
      expect(db.where).toHaveBeenCalledWith({ player_id: 123 });
      expect(result).toEqual(mockUser);
    });
  });

  describe('createUserDetail', () => {
    it('should insert a user and return the new record', async () => {
      const userData = { player_id: 123, name: 'TestUser' };
      const expectedRecord = {
        player_id: 123,
        name: 'TestUser',
        raw_data: JSON.stringify(userData)
      };
      
      db.insert.mockReturnValue({
        returning: jest.fn().mockResolvedValue([expectedRecord])
      });

      const result = await userDetailModel.createUserDetail(userData);
      
      expect(db).toHaveBeenCalledWith('users');
      expect(db.insert).toHaveBeenCalledWith(expect.objectContaining({
        player_id: 123,
        name: 'TestUser',
        raw_data: expect.any(String)
      }));
      expect(result).toEqual(expectedRecord);
    });
  });

  describe('updateUserDetail', () => {
    it('should update a user and return the updated record', async () => {
      const playerId = 123;
      const userData = { name: 'UpdatedUser' };
      const updatedUser = { 
        player_id: playerId, 
        name: 'UpdatedUser',
        raw_data: JSON.stringify(userData)
      };
      
      db.where.mockReturnValue({
        update: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([updatedUser])
        })
      });

      const result = await userDetailModel.updateUserDetail(playerId, userData);
      
      expect(db).toHaveBeenCalledWith('users');
      expect(db.where).toHaveBeenCalledWith({ player_id: playerId });
      expect(result).toEqual(updatedUser);
    });
  });

  describe('upsertUserDetail', () => {
    it('should update when user exists', async () => {
      const userData = { player_id: 123, name: 'ExistingUser' };
      const updatedUser = { 
        player_id: 123, 
        name: 'ExistingUser',
        raw_data: JSON.stringify(userData)
      };
      
      // Mock getUserDetailById to return an existing user
      jest.spyOn(userDetailModel, 'getUserDetailById').mockResolvedValue({ player_id: 123 });
      
      // Mock updateUserDetail
      jest.spyOn(userDetailModel, 'updateUserDetail').mockResolvedValue(updatedUser);

      const result = await userDetailModel.upsertUserDetail(userData);
      
      expect(userDetailModel.getUserDetailById).toHaveBeenCalledWith(123);
      expect(userDetailModel.updateUserDetail).toHaveBeenCalledWith(123, userData);
      expect(result).toEqual(updatedUser);
    });

    it('should create when user does not exist', async () => {
      const userData = { player_id: 456, name: 'NewUser' };
      const newUser = { 
        player_id: 456, 
        name: 'NewUser',
        raw_data: JSON.stringify(userData)
      };
      
      // Mock getUserDetailById to return null (user doesn't exist)
      jest.spyOn(userDetailModel, 'getUserDetailById').mockResolvedValue(null);
      
      // Mock createUserDetail
      jest.spyOn(userDetailModel, 'createUserDetail').mockResolvedValue(newUser);

      const result = await userDetailModel.upsertUserDetail(userData);
      
      expect(userDetailModel.getUserDetailById).toHaveBeenCalledWith(456);
      expect(userDetailModel.createUserDetail).toHaveBeenCalledWith(userData);
      expect(result).toEqual(newUser);
    });
  });
}); 