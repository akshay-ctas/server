import { User, IUser } from './user.model.js';

export class UserService {
  static async create(data: Pick<IUser, 'name' | 'email'>): Promise<IUser> {
    return User.create(data);
  }

  static async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email });
  }
}
