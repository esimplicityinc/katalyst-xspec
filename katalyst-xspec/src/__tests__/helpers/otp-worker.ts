// Another worker: takes a one-time code at FAKE_NOW and prints it.
import { freshOneTimeCode } from '../../auth/otp.js';

const now = Number(process.env.FAKE_NOW);
console.log(await freshOneTimeCode('pm', { now: () => now, sleep: async () => {}, username: process.env.OTP_USER }));
