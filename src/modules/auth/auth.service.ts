import { OTPModel } from '../users/otp.model.js';
import { IUser, User } from '../users/user.model.js';
import { RegisterInput } from './validation.js';

export class AuthService {
  static async register(user: RegisterInput): Promise<IUser> {
    return User.create(user);
  }

  static async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email });
  }

  static async findByEmailWithPassword(email: string): Promise<IUser | null> {
    return User.findOne({ email }).select('+password');
  }

  static async findById(id: string): Promise<IUser | null> {
    return User.findById(id);
  }
  static async findByIdWithPassword(id: string): Promise<IUser | null> {
    return User.findById(id).select('+password');
  }
  static async updateEmailVerified(email: string): Promise<boolean> {
    const result = await User.updateOne(
      { email },
      { $set: { isEmailVerified: true } }
    );
    return result.matchedCount > 0 && result.modifiedCount > 0;
  }
  static async verifyOtp(email: string, otp: string): Promise<boolean> {
    const record = await OTPModel.findOne({ email, type: 'verify' }).sort({
      createdAt: -1,
    });

    if (!record) return false;
    if (record.expiresAt < new Date()) {
      await OTPModel.deleteMany({ email });
      return false;
    }
    if (Number(record.otp) !== Number(otp)) return false;

    await OTPModel.deleteMany({ email });
    return this.updateEmailVerified(email);
  }
}
