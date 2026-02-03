const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const queueService = require('../services/queue');

// POST /api/process
router.post('/process', async (req, res) => {
    try {
        const { urls } = req.body;
        if (!urls || !Array.isArray(urls) || urls.length === 0) {
            return res.status(400).json({ error: 'Invalid URLs provided' });
        }

        const jobId = uuidv4();
        // Add to queue
        const job = queueService.addJob(jobId, urls);

        res.status(202).json({
            message: 'Processing started',
            jobId: jobId,
            status: job.status
        });
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/status/:jobId
router.get('/status/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = queueService.getJob(jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
});

// GET /api/download/:jobId
router.get('/download/:jobId', (req, res) => {
    const { jobId } = req.params;
    const filePath = queueService.getJobResultPath(jobId);

    if (!filePath) {
        return res.status(404).json({ error: 'Result not ready or job not found' });
    }

    res.download(filePath);
});

module.exports = router;
