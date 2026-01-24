import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('Verifying Price History Logic...');

    // Cleanup previous run if needed or use unique IDs
    const uniqueId = Date.now().toString();
    const nftId = 'test-price-nft-' + uniqueId;

    // Create dummy Users
    const users = ['0x0', '0x1', '0x2', '0x3', '0x4'];
    for (const u of users) {
        await prisma.user.upsert({ where: { address: u }, update: {}, create: { address: u } });
    }

    const nft = await prisma.nFT.create({
        data: {
            tokenId: uniqueId,
            contractAddress: '0xpricecheck',
            ownerAddress: '0x1',
            tokenURI: 'test',
        }
    });

    console.log('Created NFT:', nft.id);

    // Create mixed history
    // 1. MINT (Should be excluded)
    await prisma.nFTHistory.create({
        data: {
            nftId: nft.id,
            fromAddress: '0x0',
            toAddress: '0x1',
            price: '0',
            type: 'MINT',
            txHash: '0x1',
            createdAt: new Date('2025-01-01T10:00:00Z')
        }
    });

    // 2. SALE 1 (Should be included, first)
    await prisma.nFTHistory.create({
        data: {
            nftId: nft.id,
            fromAddress: '0x1',
            toAddress: '0x2',
            price: '10.5',
            type: 'SALE',
            txHash: '0x2',
            createdAt: new Date('2025-01-02T10:00:00Z')
        }
    });

    // 3. TRANSFER (Should be excluded)
    await prisma.nFTHistory.create({
        data: {
            nftId: nft.id,
            fromAddress: '0x2',
            toAddress: '0x3',
            price: '0',
            type: 'TRANSFER',
            txHash: '0x3',
            createdAt: new Date('2025-01-03T10:00:00Z')
        }
    });

    // 4. SALE 2 (Should be included, second)
    await prisma.nFTHistory.create({
        data: {
            nftId: nft.id,
            fromAddress: '0x3',
            toAddress: '0x4',
            price: '20.0',
            type: 'SALE',
            txHash: '0x4',
            createdAt: new Date('2025-01-04T10:00:00Z')
        }
    });

    // Run Logic (Simulate Controller Query)
    const history = await prisma.nFTHistory.findMany({
        where: {
            nft: {
                contractAddress: '0xpricecheck',
                tokenId: uniqueId,
            },
            type: 'SALE',
            price: { not: "0" }
        },
        select: {
            price: true,
            createdAt: true,
        },
        orderBy: {
            createdAt: 'asc',
        },
    });

    console.log('Fetched Price History:', history);

    if (history.length === 2 && history[0].price === '10.5' && history[1].price === '20.0') {
        console.log('Verification Success!');
    } else {
        console.error('Verification Failed!');
        process.exit(1);
    }
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
