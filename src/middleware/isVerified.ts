import { Request, Response, NextFunction } from 'express';
import { User } from '../modules/users/user.model.js';

export const isVerified = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.user as any;

  const userDoc = await User.findById(user.sub);

  if (!userDoc) {
    return res.status(401).json({ message: 'user not found' });
  }

  if (!userDoc.isEmailVerified) {
    return res.status(403).json({ message: 'Email not verified' });
  }

  next();
};
