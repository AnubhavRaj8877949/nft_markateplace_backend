import { Router } from 'express';
import { getUser, createUser } from '../controllers/user.controller';

const router = Router();

router.get('/:address', getUser);
router.post('/', createUser);

export default router;
