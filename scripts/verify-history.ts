import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('Verifying History Schema...');
    // Create a dummy user
    await prisma.user.upsert({ where: { address: '0x1' }, update: {}, create: { address: '0x1' } });
    await prisma.user.upsert({ where: { address: '0x2' }, update: {}, create: { address: '0x2' } });

    // Create a dummy NFT
    const nft = await prisma.nFT.upsert({
        where: {
            contractAddress_tokenId: {
                contractAddress: '0xtest',
                tokenId: '1'
            }
        },
        update: {},
        create: {
            contractAddress: '0xtest',
            tokenId: '1',
            ownerAddress: '0x1',
            tokenURI: 'xyz'
        }
    });

    console.log('Created/Found NFT:', nft.id);

    // Create history
    console.log('Creating history entry...');
    const history = await prisma.nFTHistory.create({
        data: {
            nftId: nft.id,
            fromAddress: '0x1',
            toAddress: '0x2',
            price: '1.5',
            type: 'SALE',
            txHash: '0xhash'
        }
    });

    console.log('Created history:', history);

    // Fetch History
    const fetched = await prisma.nFTHistory.findFirst({
        where: { id: history.id },
        include: { from: true, to: true, nft: true }
    });
    console.log('Fetched history with relations:', fetched);

    if (fetched && fetched.fromAddress === '0x1' && fetched.toAddress === '0x2') {
        console.log('Verification Success!');
    } else {
        console.error('Verification Failed!');
        process.exit(1);
    }
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
