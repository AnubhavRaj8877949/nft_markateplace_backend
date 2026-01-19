-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NFT" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "ownerAddress" TEXT NOT NULL,
    "tokenURI" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "image" TEXT,
    "collectionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NFT_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "nftId" TEXT NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "sellerAddress" TEXT NOT NULL,
    "nftId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "offererAddress" TEXT NOT NULL,
    "nftId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_address_key" ON "User"("address");

-- CreateIndex
CREATE UNIQUE INDEX "NFT_contractAddress_tokenId_key" ON "NFT"("contractAddress", "tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_name_key" ON "Collection"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Event_transactionHash_key" ON "Event"("transactionHash");

-- AddForeignKey
ALTER TABLE "NFT" ADD CONSTRAINT "NFT_ownerAddress_fkey" FOREIGN KEY ("ownerAddress") REFERENCES "User"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NFT" ADD CONSTRAINT "NFT_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_nftId_fkey" FOREIGN KEY ("nftId") REFERENCES "NFT"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_sellerAddress_fkey" FOREIGN KEY ("sellerAddress") REFERENCES "User"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_nftId_fkey" FOREIGN KEY ("nftId") REFERENCES "NFT"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_offererAddress_fkey" FOREIGN KEY ("offererAddress") REFERENCES "User"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_nftId_fkey" FOREIGN KEY ("nftId") REFERENCES "NFT"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
