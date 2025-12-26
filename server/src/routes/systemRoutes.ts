import express from 'express';
import { getSystemSettings } from '../controllers/adminController';

const router = express.Router();

// Allow anyone (or at least authenticated users) to read settings
// For now, let's keep it open or use separate middleware if needed.
// Since ads are for everyone, public read is fine.
router.get('/settings', getSystemSettings);

export default router;
