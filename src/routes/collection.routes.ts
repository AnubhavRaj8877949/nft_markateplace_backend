import { Router } from 'express';
import { getCollections } from '../controllers/collection.controller';

const router = Router();

router.get('/', getCollections);

export default router;
