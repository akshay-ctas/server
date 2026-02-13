import { IUser, User } from '../users/user.model.js';
import { RegisterInput } from './validation.js';

export class UserService {
  static async register(user: RegisterInput): Promise<IUser> {
    return User.create(user);
  }
  //findByEmail
  static async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email });
  }

  static async findByEmailWithPassword(email: string): Promise<IUser | null> {
    return User.findOne({ email }).select('+password');
  }

  static async findById(id: string): Promise<IUser | null> {
    return User.findById(id);
  }
}
