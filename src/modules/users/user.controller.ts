import { Request, Response } from 'express';
import { UserService } from './user.service.js';
import createHttpError from 'http-errors'; // npm i http-errors @types/http-errors

export const createUser = async (req: Request, res: Response) => {
  const user = await UserService.create(req.body);
  res.status(201).json(user);
};

export const getUser = async (req: Request, res: Response) => {
  const user = await UserService.findByEmail(req.params.email as string);
  if (!user) throw createHttpError(404, 'User not found');
  res.json(user);
};
