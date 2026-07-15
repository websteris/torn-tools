const db = require('../../../db');
const userAccountModel = require('../../../models/userAccount');

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

describe('UserAccount Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserAccountById', () => {
    it('should call the database with correct parameters', async () => {
      const mockUser = { 
        player_id: 123, 
        name: 'TestUser', 
        username: 'testuser', 
        password_hash: 'hashedpassword',
        preferences: '{"theme":"dark"}'
      };
      
      db.where.mockReturnValue({
        first: jest.fn().mockResolvedValue(mockUser)
      });

      const result = await userAccountModel.getUserAccountById(123);
      
      expect(db).toHaveBeenCalledWith('user_accounts');
      expect(db.where).toHaveBeenCalledWith({ player_id: 123 });
      expect(result).toEqual(mockUser);
    });
  });

  describe('createUserAccount', () => {
    it('should insert a user account and return the new record', async () => {
      const accountData = { 
        player_id: 123, 
        name: 'TestUser',
        username: 'testuser',
        password_hash: 'hashedpassword',
        preferences: { theme: 'dark' },
        raw_data: { player_id: 123, name: 'TestUser' }
      };
      
      const expectedRecord = {
        player_id: 123,
        name: 'TestUser',
        username: 'testuser',
        password_hash: 'hashedpassword',
        preferences: JSON.stringify({ theme: 'dark' }),
        raw_data: JSON.stringify({ player_id: 123, name: 'TestUser' })
      };
      
      db.insert.mockReturnValue({
        returning: jest.fn().mockResolvedValue([expectedRecord])
      });

      const result = await userAccountModel.createUserAccount(accountData);
      
      expect(db).toHaveBeenCalledWith('user_accounts');
      expect(db.insert).toHaveBeenCalledWith(expect.objectContaining({
        player_id: 123,
        name: 'TestUser',
        username: 'testuser',
        password_hash: 'hashedpassword',
        preferences: expect.any(String),
        raw_data: expect.any(String)
      }));
      expect(result).toEqual(expectedRecord);
    });

    it('should handle missing optional fields', async () => {
      const accountData = { 
        player_id: 123, 
        name: 'TestUser'
      };
      
      const expectedRecord = {
        player_id: 123,
        name: 'TestUser',
        username: null,
        password_hash: null,
        preferences: '{}',
        raw_data: '{}'
      };
      
      db.insert.mockReturnValue({
        returning: jest.fn().mockResolvedValue([expectedRecord])
      });

      const result = await userAccountModel.createUserAccount(accountData);
      
      expect(db).toHaveBeenCalledWith('user_accounts');
      expect(result).toEqual(expectedRecord);
    });
  });

  describe('updateUserAccount', () => {
    it('should update a user account and return the updated record', async () => {
      const playerId = 123;
      const accountData = { 
        name: 'UpdatedUser',
        username: 'updateduser',
        password_hash: 'newhash',
        preferences: { theme: 'light' }
      };
      
      const updatedUser = {
        player_id: playerId,
        name: 'UpdatedUser',
        username: 'updateduser',
        password_hash: 'newhash',
        preferences: JSON.stringify({ theme: 'light' })
      };
      
      db.where.mockReturnValue({
        update: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([updatedUser])
        })
      });

      const result = await userAccountModel.updateUserAccount(playerId, accountData);
      
      expect(db).toHaveBeenCalledWith('user_accounts');
      expect(db.where).toHaveBeenCalledWith({ player_id: playerId });
      expect(result).toEqual(updatedUser);
    });

    it('should only update provided fields', async () => {
      const playerId = 123;
      const accountData = { 
        name: 'UpdatedUser',
        // Only updating name, not other fields
      };
      
      const updatedUser = {
        player_id: playerId,
        name: 'UpdatedUser',
        // Other fields remain unchanged
      };
      
      db.where.mockReturnValue({
        update: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([updatedUser])
        })
      });

      const result = await userAccountModel.updateUserAccount(playerId, accountData);
      
      expect(db).toHaveBeenCalledWith('user_accounts');
      expect(db.where).toHaveBeenCalledWith({ player_id: playerId });
      // Check that we're not sending undefined values to the database
      expect(db.where().update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          password_hash: undefined,
          preferences: undefined,
          raw_data: undefined
        })
      );
      expect(result).toEqual(updatedUser);
    });
  });

  describe('upsertUserAccount', () => {
    it('should update when user account exists', async () => {
      const accountData = { 
        player_id: 123, 
        name: 'ExistingUser',
        username: 'existinguser'
      };
      
      const updatedUser = {
        player_id: 123,
        name: 'ExistingUser',
        username: 'existinguser'
      };
      
      // Mock getUserAccountById to return an existing user
      jest.spyOn(userAccountModel, 'getUserAccountById').mockResolvedValue({ player_id: 123 });
      
      // Mock updateUserAccount
      jest.spyOn(userAccountModel, 'updateUserAccount').mockResolvedValue(updatedUser);

      const result = await userAccountModel.upsertUserAccount(accountData);
      
      expect(userAccountModel.getUserAccountById).toHaveBeenCalledWith(123);
      expect(userAccountModel.updateUserAccount).toHaveBeenCalledWith(123, accountData);
      expect(result).toEqual(updatedUser);
    });

    it('should create when user account does not exist', async () => {
      const accountData = { 
        player_id: 456, 
        name: 'NewUser',
        username: 'newuser'
      };
      
      const newUser = {
        player_id: 456,
        name: 'NewUser',
        username: 'newuser'
      };
      
      // Mock getUserAccountById to return null (user doesn't exist)
      jest.spyOn(userAccountModel, 'getUserAccountById').mockResolvedValue(null);
      
      // Mock createUserAccount
      jest.spyOn(userAccountModel, 'createUserAccount').mockResolvedValue(newUser);

      const result = await userAccountModel.upsertUserAccount(accountData);
      
      expect(userAccountModel.getUserAccountById).toHaveBeenCalledWith(456);
      expect(userAccountModel.createUserAccount).toHaveBeenCalledWith(accountData);
      expect(result).toEqual(newUser);
    });
  });
}); 