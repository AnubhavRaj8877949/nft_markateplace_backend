# NFT Marketplace Backend

Node.js and Express backend using Prisma ORM and PostgreSQL.

## Setup

1.  Install dependencies:
    ```bash
    npm install
    ```

2.  Set up environment variables:
    Copy `.env.example` to `.env` and update the `DATABASE_URL`.

3.  Run database migrations:
    ```bash
    npx prisma migrate dev
    ```

4.  Start the server:
    ```bash
    npm run dev
    ```

## API Endpoints

-   `GET /health`: Health check
-   `GET /nfts`: List NFTs
-   `GET /users/:address`: Get user details
-   `GET /listings`: Get active listings
