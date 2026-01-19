import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getListings = async (req: Request, res: Response) => {
    try {
        const { collectionId, sellerAddress } = req.query;
        const listings = await prisma.listing.findMany({
            where: {
                active: true,
                ...(collectionId ? { nft: { collectionId: collectionId as string } } : {}),
                ...(sellerAddress ? { sellerAddress: (sellerAddress as string).toLowerCase() } : {}),
            },
            include: {
                nft: { include: { media: true, collection: true } },
                seller: true
            },
        });
        res.json(listings);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching listings' });
    }
};
