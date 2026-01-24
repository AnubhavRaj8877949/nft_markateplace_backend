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

export const getNFTHistory = async (req: Request, res: Response) => {
    try {
        const { contractAddress, tokenId } = req.params;
        // Find NFT first to get internal ID or just query by relation
        // Better to query by relation on NFTHistory directly if possible, but schema has relation on 'nft'.
        // We can query NFTHistory where nft matches contractAddress and tokenId.
        const history = await prisma.nFTHistory.findMany({
            where: {
                nft: {
                    contractAddress: (contractAddress as string).toLowerCase(),
                    tokenId: tokenId as string,
                }
            },
            include: {
                from: true,
                to: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching NFT history' });
    }
};

export const getNFTPriceHistory = async (req: Request, res: Response) => {
    try {
        const { contractAddress, tokenId } = req.params;
        const history = await prisma.nFTHistory.findMany({
            where: {
                nft: {
                    contractAddress: (contractAddress as string).toLowerCase(),
                    tokenId: tokenId as string,
                },
                type: 'SALE', // Only show completed sales for price graph
                price: { not: "0" } // Double check to exclude zero price events if any
            },
            select: {
                price: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: 'asc', // Ascending for graph
            },
        });
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching NFT price history' });
    }
};

export const createNFT = async (req: Request, res: Response) => {
    try {
        const { tokenId, contractAddress, ownerAddress, tokenURI } = req.body;
        const nft = await prisma.$transaction(async (tx) => {
            const newNft = await tx.nFT.create({
                data: {
                    tokenId,
                    contractAddress,
                    ownerAddress,
                    tokenURI,
                },
            });

            await tx.nFTHistory.create({
                data: {
                    nftId: newNft.id,
                    fromAddress: "0x0000000000000000000000000000000000000000",
                    toAddress: ownerAddress,
                    price: "0",
                    type: "MINT",
                    txHash: "API_MINT_" + Date.now(), // Placeholder for API-created mints
                }
            });

            return newNft;
        });
        res.json(nft);
    } catch (error) {
        res.status(500).json({ error: 'Error creating NFT' });
    }
};
