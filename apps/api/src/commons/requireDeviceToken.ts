import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { HttpError } from './httpError.js';

export function requireDeviceToken(
	req: Request,
	_res: Response,
	next: NextFunction,
) {
	if (env.DEVICE_TOKEN && req.header('x-device-token') !== env.DEVICE_TOKEN) {
		throw new HttpError(401, 'Token do dispositivo inválido');
	}
	next();
}
