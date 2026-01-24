import { Router } from 'express';
import { getNFTs, getNFTDetails, createNFT, getNFTHistory, getNFTPriceHistory } from '../controllers/nft.controller';

const router = Router();

router.get('/', getNFTs);
router.get('/:contractAddress/:tokenId', getNFTDetails);
router.get('/:contractAddress/:tokenId/history', getNFTHistory);
router.get('/:contractAddress/:tokenId/price-history', getNFTPriceHistory);
router.post('/', createNFT);

export default router;
