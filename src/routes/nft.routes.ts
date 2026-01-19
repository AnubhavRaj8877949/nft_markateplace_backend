import { Router } from 'express';
import { getNFTs, getNFTDetails, createNFT } from '../controllers/nft.controller';

const router = Router();

router.get('/', getNFTs);
router.get('/:contractAddress/:tokenId', getNFTDetails);
router.post('/', createNFT);

export default router;
