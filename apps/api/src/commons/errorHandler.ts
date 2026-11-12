import type { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { HttpError } from './httpError.js';

/** Formato de erro consumido pelo front: { statusCode, message }. */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
	if (error instanceof ZodError) {
		res.status(400).json({
			statusCode: 400,
			message: error.issues.map(
				(issue) => `${issue.path.join('.')}: ${issue.message}`,
			),
		});
		return;
	}

	if (error instanceof mongoose.Error.CastError) {
		res.status(400).json({ statusCode: 400, message: 'ID inválido' });
		return;
	}

	if (error instanceof HttpError) {
		res.status(error.statusCode).json({
			statusCode: error.statusCode,
			message: error.message,
		});
		return;
	}

	console.error(error);
	res.status(500).json({ statusCode: 500, message: 'Erro interno' });
};
