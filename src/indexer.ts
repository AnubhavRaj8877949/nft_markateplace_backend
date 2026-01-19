import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const MARKETPLACE_ABI = [
    "event ItemListed(address indexed seller, address indexed nftAddress, uint256 indexed tokenId, uint256 price)",
    "event ItemCanceled(address indexed seller, address indexed nftAddress, uint256 indexed tokenId)",
    "event ItemBought(address indexed buyer, address indexed nftAddress, uint256 indexed tokenId, uint256 price)",
    "event OfferCreated(address indexed offerer, address indexed nftAddress, uint256 indexed tokenId, uint256 price)",
    "event OfferAccepted(address indexed seller, address indexed offerer, address indexed nftAddress, uint256 tokenId, uint256 price)",
    "event OfferCanceled(address indexed offerer, address indexed nftAddress, uint256 indexed tokenId)"
];

const NFT_ABI = [
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
    "function tokenURI(uint256 tokenId) view returns (string)"
];

const MARKETPLACE_ADDRESS = process.env.MARKETPLACE_ADDRESS || "";
const NFT_ADDRESS = process.env.NFT_ADDRESS || "";
const RPC_URL = process.env.RPC_URL || "";

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const marketplaceContract = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);
    const nftContract = new ethers.Contract(NFT_ADDRESS, NFT_ABI, provider);

    console.log(`Starting robust indexer...`);
    console.log(`Marketplace: ${MARKETPLACE_ADDRESS}`);
    console.log(`NFT: ${NFT_ADDRESS}`);

    let lastBlock = await provider.getBlockNumber();
    console.log(`Starting from block ${lastBlock}`);

    // Polling loop
    while (true) {
        try {
            const currentBlock = await provider.getBlockNumber();
            if (currentBlock > lastBlock) {
                const fromBlock = lastBlock + 1;
                const toBlock = currentBlock;
                console.log(`Scanning blocks ${fromBlock} to ${toBlock}...`);

                // 1. Scan NFT Transfers
                const transferLogs = await nftContract.queryFilter("Transfer", fromBlock, toBlock);
                for (const log of transferLogs) {
                    const { from, to, tokenId } = (log as any).args;
                    await handleTransfer(from, to, tokenId, nftContract);
                }

                // 2. Scan Marketplace Listings
                const listedLogs = await marketplaceContract.queryFilter("ItemListed", fromBlock, toBlock);
                for (const log of listedLogs) {
                    const { seller, nftAddress, tokenId, price } = (log as any).args;
                    await handleItemListed(seller, nftAddress, tokenId, price);
                }

                // 3. Scan Marketplace Purchases
                const boughtLogs = await marketplaceContract.queryFilter("ItemBought", fromBlock, toBlock);
                for (const log of boughtLogs) {
                    const { buyer, nftAddress, tokenId } = (log as any).args;
                    await handleItemBought(buyer, nftAddress, tokenId);
                }

                // 4. Scan Marketplace Cancellations
                const canceledLogs = await marketplaceContract.queryFilter("ItemCanceled", fromBlock, toBlock);
                for (const log of canceledLogs) {
                    const { seller, nftAddress, tokenId } = (log as any).args;
                    await handleItemCanceled(seller, nftAddress, tokenId);
                }

                // 5. Scan Marketplace Offers
                const offerCreatedLogs = await marketplaceContract.queryFilter("OfferCreated", fromBlock, toBlock);
                for (const log of offerCreatedLogs) {
                    const { offerer, nftAddress, tokenId, price } = (log as any).args;
                    await handleOfferCreated(offerer, nftAddress, tokenId, price);
                }

                const offerAcceptedLogs = await marketplaceContract.queryFilter("OfferAccepted", fromBlock, toBlock);
                for (const log of offerAcceptedLogs) {
                    const { seller, offerer, nftAddress, tokenId, price } = (log as any).args;
                    await handleOfferAccepted(seller, offerer, nftAddress, tokenId, price);
                }

                const offerCanceledLogs = await marketplaceContract.queryFilter("OfferCanceled", fromBlock, toBlock);
                for (const log of offerCanceledLogs) {
                    const { offerer, nftAddress, tokenId } = (log as any).args;
                    await handleOfferCanceled(offerer, nftAddress, tokenId);
                }

                lastBlock = toBlock;
            }
        } catch (error) {
            console.error("Error in polling loop:", error);
        }
        // Wait for 5 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

async function handleTransfer(from: string, to: string, tokenId: any, nftContract: ethers.Contract) {
    const normalizedTo = to.toLowerCase();
    const normalizedFrom = from.toLowerCase();
    const tokenIdStr = tokenId.toString();

    console.log(`Transfer detected: Token #${tokenIdStr} from ${normalizedFrom} to ${normalizedTo}`);

    try {
        // 1. Ensure "to" user exists
        await prisma.user.upsert({
            where: { address: normalizedTo },
            update: {},
            create: { address: normalizedTo },
        });

        // 2. Fetch metadata if it's a mint or if we don't have it yet
        let tokenURI = "";
        let metadata: any = {};

        const existingNft = await prisma.nFT.findUnique({
            where: {
                contractAddress_tokenId: {
                    contractAddress: NFT_ADDRESS.toLowerCase(),
                    tokenId: tokenIdStr,
                }
            }
        });

        if (!existingNft || normalizedFrom === ethers.ZeroAddress) {
            try {
                tokenURI = await nftContract.tokenURI(tokenId);
                if (tokenURI.startsWith('ipfs://')) {
                    tokenURI = tokenURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
                }
                const response = await fetch(tokenURI);
                metadata = await response.json();
            } catch (e) {
                console.error(`Error fetching metadata for token ${tokenIdStr}:`, e);
            }
        }

        // 3. Upsert NFT
        const nft = await prisma.nFT.upsert({
            where: {
                contractAddress_tokenId: {
                    contractAddress: NFT_ADDRESS.toLowerCase(),
                    tokenId: tokenIdStr,
                }
            },
            update: {
                ownerAddress: normalizedTo,
                ...(tokenURI && { tokenURI }),
                ...(metadata.name && { name: metadata.name }),
                ...(metadata.description && { description: metadata.description }),
                ...(metadata.image && { image: metadata.image }),
            },
            create: {
                tokenId: tokenIdStr,
                contractAddress: NFT_ADDRESS.toLowerCase(),
                ownerAddress: normalizedTo,
                tokenURI: tokenURI || "",
                name: metadata.name || null,
                description: metadata.description || null,
                image: metadata.image || null,
            }
        });

        // 4. Handle Multiple Media if metadata was fetched
        if (metadata.media && Array.isArray(metadata.media)) {
            await prisma.media.deleteMany({ where: { nftId: nft.id } });
            for (const m of metadata.media) {
                await prisma.media.create({
                    data: {
                        url: m.url,
                        type: m.type,
                        nftId: nft.id
                    }
                });
            }
        }

        // 5. Handle Collection if metadata was fetched
        if (metadata.collection) {
            const collectionName = typeof metadata.collection === 'string' ? metadata.collection : metadata.collection.name;
            if (collectionName) {
                const collection = await prisma.collection.upsert({
                    where: { name: collectionName },
                    update: {},
                    create: {
                        name: collectionName,
                        description: metadata.collection.description || null,
                        image: metadata.collection.image || null
                    },
                });
                await prisma.nFT.update({
                    where: { id: nft.id },
                    data: { collectionId: collection.id }
                });
            }
        }

    } catch (e) {
        console.error("Error indexing Transfer:", e);
    }
}

async function handleItemListed(seller: string, nftAddress: string, tokenId: any, price: any) {
    const normalizedSeller = seller.toLowerCase();
    const normalizedNftAddress = nftAddress.toLowerCase();
    console.log(`ItemListed: ${normalizedNftAddress} #${tokenId} for ${price} by ${normalizedSeller}`);
    try {
        const nft = await prisma.nFT.findUnique({
            where: {
                contractAddress_tokenId: {
                    contractAddress: normalizedNftAddress,
                    tokenId: tokenId.toString(),
                }
            }
        });

        if (!nft) {
            console.error(`NFT not found in DB: ${normalizedNftAddress} #${tokenId}`);
            return;
        }

        // Deactivate any previous active listings for this NFT
        await prisma.listing.updateMany({
            where: {
                nftId: nft.id,
                active: true
            },
            data: { active: false }
        });

        await prisma.listing.create({
            data: {
                sellerAddress: normalizedSeller,
                nftId: nft.id,
                price: ethers.formatEther(price),
                active: true,
            }
        });
    } catch (e) {
        console.error("Error indexing ItemListed:", e);
    }
}

async function handleItemBought(buyer: string, nftAddress: string, tokenId: any) {
    const normalizedBuyer = buyer.toLowerCase();
    const normalizedNftAddress = nftAddress.toLowerCase();
    console.log(`ItemBought: ${normalizedNftAddress} #${tokenId} by ${normalizedBuyer}`);
    try {
        const nft = await prisma.nFT.findUnique({
            where: {
                contractAddress_tokenId: {
                    contractAddress: normalizedNftAddress,
                    tokenId: tokenId.toString(),
                }
            }
        });

        if (nft) {
            await prisma.listing.updateMany({
                where: { nftId: nft.id, active: true },
                data: { active: true }
            });
        }
    } catch (e) {
        console.error("Error indexing ItemBought:", e);
    }
}

async function handleItemCanceled(seller: string, nftAddress: string, tokenId: any) {
    const normalizedNftAddress = nftAddress.toLowerCase();
    console.log(`ItemCanceled: ${normalizedNftAddress} #${tokenId}`);
    try {
        const nft = await prisma.nFT.findUnique({
            where: {
                contractAddress_tokenId: {
                    contractAddress: normalizedNftAddress,
                    tokenId: tokenId.toString(),
                }
            }
        });

        if (nft) {
            await prisma.listing.updateMany({
                where: { nftId: nft.id, active: true },
                data: { active: false }
            });
        }
    } catch (e) {
        console.error("Error indexing ItemCanceled:", e);
    }
}

async function handleOfferCreated(offerer: string, nftAddress: string, tokenId: any, price: any) {
    const normalizedOfferer = offerer.toLowerCase();
    const normalizedNftAddress = nftAddress.toLowerCase();
    console.log(`OfferCreated: ${normalizedNftAddress} #${tokenId} by ${normalizedOfferer} for ${price}`);
    try {
        const nft = await prisma.nFT.findUnique({
            where: {
                contractAddress_tokenId: {
                    contractAddress: normalizedNftAddress,
                    tokenId: tokenId.toString(),
                }
            }
        });

        if (!nft) {
            console.error(`NFT not found for offer: ${normalizedNftAddress} #${tokenId}`);
            return;
        }

        await prisma.user.upsert({
            where: { address: normalizedOfferer },
            update: {},
            create: { address: normalizedOfferer },
        });

        await prisma.offer.create({
            data: {
                offererAddress: normalizedOfferer,
                nftId: nft.id,
                price: ethers.formatEther(price),
                active: true,
            }
        });
    } catch (e) {
        console.error("Error indexing OfferCreated:", e);
    }
}

async function handleOfferAccepted(seller: string, offerer: string, nftAddress: string, tokenId: any, price: any) {
    const normalizedOfferer = offerer.toLowerCase();
    const normalizedSeller = seller.toLowerCase();
    const normalizedNftAddress = nftAddress.toLowerCase();
    console.log(`OfferAccepted: ${normalizedNftAddress} #${tokenId} from ${normalizedOfferer} accepted by ${normalizedSeller}`);
    try {
        const nft = await prisma.nFT.findUnique({
            where: {
                contractAddress_tokenId: {
                    contractAddress: normalizedNftAddress,
                    tokenId: tokenId.toString(),
                }
            }
        });

        if (!nft) return;

        // Ensure offerer exists in DB
        await prisma.user.upsert({
            where: { address: normalizedOfferer },
            update: {},
            create: { address: normalizedOfferer },
        });

        // Deactivate all offers for this NFT
        await prisma.offer.updateMany({
            where: { nftId: nft.id, active: true },
            data: { active: false }
        });

        // Deactivate all listings for this NFT
        await prisma.listing.updateMany({
            where: { nftId: nft.id, active: true },
            data: { active: false }
        });

        // Update NFT owner
        await prisma.nFT.update({
            where: { id: nft.id },
            data: { ownerAddress: normalizedOfferer }
        });
    } catch (e) {
        console.error("Error indexing OfferAccepted:", e);
    }
}

async function handleOfferCanceled(offerer: string, nftAddress: string, tokenId: any) {
    const normalizedOfferer = offerer.toLowerCase();
    const normalizedNftAddress = nftAddress.toLowerCase();
    console.log(`OfferCanceled: ${normalizedNftAddress} #${tokenId} by ${normalizedOfferer}`);
    try {
        const nft = await prisma.nFT.findUnique({
            where: {
                contractAddress_tokenId: {
                    contractAddress: normalizedNftAddress,
                    tokenId: tokenId.toString(),
                }
            }
        });

        if (!nft) return;

        await prisma.offer.updateMany({
            where: {
                nftId: nft.id,
                offererAddress: normalizedOfferer,
                active: true
            },
            data: { active: false }
        });
    } catch (e) {
        console.error("Error indexing OfferCanceled:", e);
    }
}

main().catch(console.error);
