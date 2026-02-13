import { Request, Response } from 'express';
import { UserService } from './auth.service.js';
import { loginSchema, registerSchema } from './validation.js';
import createHttpError from 'http-errors';
import bcrypt from 'bcrypt';
import { S3Storage } from '../../services/S3Storage.js';
import { UploadedFile } from 'express-fileupload';
import { v4 as uuidv4 } from 'uuid';

import {
  generateAccessTokens,
  generateRefreshTokens,
} from '../../utils/utils.js';
import jwt from 'jsonwebtoken';

export const registerUser = async (req: Request, res: Response) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    throw createHttpError(
      403,
      JSON.stringify({
        type: 'VALIDATION_ERROR',
        errors: result.error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      })
    );
  }
  const image = req.files!.avatar as UploadedFile;
  const imageName = uuidv4();

  const s3Storage = new S3Storage();
  await s3Storage.upload({
    filename: imageName,
    fileData: image.data,
  });
  const isEmailExist = await UserService.findByEmail(result?.data?.email);
  if (isEmailExist) {
    throw createHttpError(400, 'Email already exists!');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(result.data.password, salt);

  const user = { ...result.data, password: hashedPassword };

  const registeredUser = await UserService.register(user);

  const safeUser = {
    id: registeredUser._id,
    firstName: registeredUser.firstName,
    lastName: registeredUser.lastName,
    email: registeredUser.email,
    phone: registeredUser.phone,
    avatar: imageName,
    gender: registeredUser.gender,
    role: registeredUser.role,
    isEmailVerified: registeredUser.isEmailVerified,
    createdAt: registeredUser.createdAt,
  };

  res.status(201).json({
    status: 'success',
    message: 'User registered successfully',
    data: safeUser,
  });
};

export const loginUser = async (req: Request, res: Response) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    throw createHttpError(
      400,
      JSON.stringify({
        type: 'VALIDATION_ERROR',
        errors: result.error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      })
    );
  }

  const { email, password } = result.data;

  const user = await UserService.findByEmailWithPassword(email);
  if (!user) {
    throw createHttpError(401, 'Invalid email or password');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw createHttpError(401, 'Invalid email or password');
  }

  const payload = {
    sub: String(user._id),
    role: user.role,
  };

  const accessToken = generateAccessTokens(payload);
  const refreshToken = generateRefreshTokens(payload);

  await user.updateOne({ lastLogin: new Date() });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({
    status: 'success',
    message: 'User logged in successfully',
    token: {
      accessToken,
    },
  });
};

export async function self(req: Request, res: Response) {
  const id = req?.user?.sub as string;
  const user = await UserService.findById(id);

  const userDto = {
    id: user?._id,
    firstName: user?.firstName,
    lastName: user?.lastName,
    email: user?.email,
    phone: user?.phone,
    gender: user?.gender,
    role: user?.role,
    avatar: user?.avatar,
    isEmailVerified: user?.isEmailVerified,
    wishlistCount: user?.wishlist,
  };

  res.send({ status: 'success', user: userDto });
}

export async function refresh(req: Request, res: Response) {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    throw createHttpError(401, 'refresh token is missing');
  }

  const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!);

  const payload = { sub: decoded.sub as string };

  const accessToken = generateAccessTokens(payload);

  res.send({ status: 'success', accessToken });
}
