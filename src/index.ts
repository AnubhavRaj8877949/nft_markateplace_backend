import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import userRoutes from './routes/user.routes';
import nftRoutes from './routes/nft.routes';
import listingRoutes from './routes/listing.routes';
import collectionRoutes from './routes/collection.routes';
import offerRoutes from './routes/offer.routes';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Routes
app.use('/users', userRoutes);
app.use('/nfts', nftRoutes);
app.use('/listings', listingRoutes);
app.use('/collections', collectionRoutes);
app.use('/offers', offerRoutes);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
