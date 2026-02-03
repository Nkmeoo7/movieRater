const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// In-memory storage for MVP
const jobs = {}; // jobId -> { status, items: [], resultUrl }
const queue = []; // List of jobIds waiting or processing

// Routes
app.get('/', (req, res) => {
    res.send('AutoReview Extractor API is running');
});

// Import API routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
