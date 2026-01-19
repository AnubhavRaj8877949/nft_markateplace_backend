import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getUser = async (req: Request, res: Response) => {
    try {
        const { address } = req.params;
        if (!address) {
            res.status(400).json({ error: 'Address is required' });
            return;
        }
        const user = await prisma.user.findUnique({
            where: { address: address as string },
            include: {
                nfts: { include: { media: true } },
                listings: {
                    where: { active: true },
                    include: { nft: { include: { media: true } } }
                },
                offers: {
                    where: { active: true },
                    include: { nft: { include: { media: true } } }
                }
            },
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching user' });
    }
};

export const createUser = async (req: Request, res: Response) => {
    try {
        const { address } = req.body;
        const user = await prisma.user.upsert({
            where: { address },
            update: {},
            create: { address },
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Error creating user' });
    }
};
