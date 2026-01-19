import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getNFTs = async (req: Request, res: Response) => {
    try {
        const { collectionId, ownerAddress } = req.query;
        const nfts = await prisma.nFT.findMany({
            where: {
                ...(collectionId ? { collectionId: collectionId as string } : {}),
                ...(ownerAddress ? { ownerAddress: (ownerAddress as string).toLowerCase() } : {}),
            },
            include: { owner: true, listings: true, collection: true, media: true },
        });
        res.json(nfts);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching NFTs' });
    }
};

export const getNFTDetails = async (req: Request, res: Response) => {
    try {
        const { contractAddress, tokenId } = req.params;
        if (!contractAddress || !tokenId) {
            res.status(400).json({ error: 'Contract address and token ID are required' });
            return;
        }
        const nft = await prisma.nFT.findUnique({
            where: {
                contractAddress_tokenId: {
                    contractAddress: contractAddress as string,
                    tokenId: tokenId as string,
                }
            },
            include: {
                owner: true,
                media: true,
                collection: true,
                listings: {
                    where: { active: true },
                    include: { seller: true }
                },
                offers: {
                    where: { active: true },
                    include: { offerer: true }
                }
            },
        });
        res.json(nft);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching NFT details' });
    }
};

export const createNFT = async (req: Request, res: Response) => {
    try {
        const { tokenId, contractAddress, ownerAddress, tokenURI } = req.body;
        const nft = await prisma.nFT.create({
            data: {
                tokenId,
                contractAddress,
                ownerAddress,
                tokenURI,
            },
        });
        res.json(nft);
    } catch (error) {
        res.status(500).json({ error: 'Error creating NFT' });
    }
};
