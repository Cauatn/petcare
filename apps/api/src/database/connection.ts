import mongoose from 'mongoose';
import { env } from '../config/env.js';

export async function connectDatabase() {
	await mongoose.connect(env.MONGODB_URI);
	console.log(`[db] conectado em ${env.MONGODB_URI}`);
}

export const isDatabaseUp = () => mongoose.connection.readyState === 1;
