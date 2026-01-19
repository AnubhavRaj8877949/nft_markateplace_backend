import { Router } from 'express';
import { getReceivedOffers, getMadeOffers } from '../controllers/offer.controller';

const router = Router();

router.get('/received/:address', getReceivedOffers);
router.get('/made/:address', getMadeOffers);

export default router;
