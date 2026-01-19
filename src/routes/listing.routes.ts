import { Router } from 'express';
import { getListings } from '../controllers/listing.controller';

const router = Router();

router.get('/', getListings);

export default router;
