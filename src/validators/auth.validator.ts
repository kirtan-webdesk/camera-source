import Joi from 'joi';
import type { RegisterDto, LoginDto } from '../models/user.model';

export const registerSchema = Joi.object<RegisterDto>({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(64).required(),
});

export const loginSchema = Joi.object<LoginDto>({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});
