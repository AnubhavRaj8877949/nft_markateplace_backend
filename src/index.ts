import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// User Routes
app.get('/users/:address', async (req, res) => {
    const { address } = req.params;
    const user = await prisma.user.findUnique({
        where: { address },
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
});

app.post('/users', async (req, res) => {
    const { address } = req.body;
    const user = await prisma.user.upsert({
        where: { address },
        update: {},
        create: { address },
    });
    res.json(user);
});

// NFT Routes
app.get('/nfts', async (req, res) => {
    const { collectionId, ownerAddress } = req.query;
    const nfts = await prisma.nFT.findMany({
        where: {
            ...(collectionId ? { collectionId: collectionId as string } : {}),
            ...(ownerAddress ? { ownerAddress: (ownerAddress as string).toLowerCase() } : {}),
        },
        include: { owner: true, listings: true, collection: true, media: true },
    });
    res.json(nfts);
});

app.get('/nfts/:contractAddress/:tokenId', async (req, res) => {
    const { contractAddress, tokenId } = req.params;
    const nft = await prisma.nFT.findUnique({
        where: {
            contractAddress_tokenId: {
                contractAddress,
                tokenId,
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
});

app.post('/nfts', async (req, res) => {
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
});

// Listing Routes
app.get('/listings', async (req, res) => {
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
});

// Collection Routes
app.get('/collections', async (req, res) => {
    const collections = await prisma.collection.findMany({
        include: {
            _count: {
                select: { nfts: true }
            }
        }
    });
    res.json(collections);
});

// Offer Routes
app.get('/offers/received/:address', async (req, res) => {
    const { address } = req.params;
    const offers = await prisma.offer.findMany({
        where: {
            nft: { ownerAddress: address },
            active: true
        },
        include: { nft: true, offerer: true }
    });
    res.json(offers);
});

app.get('/offers/made/:address', async (req, res) => {
    const { address } = req.params;
    const offers = await prisma.offer.findMany({
        where: {
            offererAddress: address,
            active: true
        },
        include: { nft: true }
    });
    res.json(offers);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
