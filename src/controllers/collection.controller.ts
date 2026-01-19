import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getCollections = async (req: Request, res: Response) => {
    try {
        const collections = await prisma.collection.findMany({
            include: {
                _count: {
                    select: { nfts: true }
                }
            }
        });
        res.json(collections);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching collections' });
    }
};
