import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getReceivedOffers = async (req: Request, res: Response) => {
    try {
        const { address } = req.params;
        if (!address) {
            res.status(400).json({ error: 'Address is required' });
            return;
        }
        const offers = await prisma.offer.findMany({
            where: {
                nft: { ownerAddress: (address as string).toLowerCase() },
                active: true
            },
            include: { nft: true, offerer: true }
        });
        res.json(offers);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching received offers' });
    }
};

export const getMadeOffers = async (req: Request, res: Response) => {
    try {
        const { address } = req.params;
        if (!address) {
            res.status(400).json({ error: 'Address is required' });
            return;
        }
        const offers = await prisma.offer.findMany({
            where: {
                offererAddress: (address as string).toLowerCase(),
                active: true
            },
            include: { nft: true }
        });
        res.json(offers);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching made offers' });
    }
};
