const queueService = require('./queue');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

// Import utilities
const youtubeUtils = require('../utils/youtube');
const whisperUtils = require('../utils/whisper');
const geminiUtils = require('../utils/gemini');

let isProcessing = false;

const processQueue = async () => {
    if (isProcessing) return;
    isProcessing = true;

    try {
        let jobId = queueService.getNextJob();
        while (jobId) {
            console.log(`Starting job: ${jobId}`);
            queueService.updateJob(jobId, { status: 'processing' });

            const job = queueService.getJob(jobId);
            const urls = job.urls;

            const results = [];

            for (const url of urls) {
                try {
                    console.log(`Processing URL: ${url}`);
                    // 1. Download Audio
                    const audioPath = await youtubeUtils.downloadAudio(url, path.join(__dirname, '../temp_downloads'));

                    // 2. Transcribe
                    const transcript = await whisperUtils.transcribe(audioPath);

                    // 3. Extract Info
                    const extractedData = await geminiUtils.extractInfo(transcript);

                    // Add URL to result
                    extractedData.url = url;
                    results.push(extractedData);

                    // Cleanup temp files
                    try {
                        if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
                        const txtPath = audioPath.replace(/\.mp3$/, '.txt');
                        if (fs.existsSync(txtPath)) fs.unlinkSync(txtPath);
                    } catch (cleanupErr) {
                        console.warn("Cleanup failed:", cleanupErr);
                    }

                    // Rate limit protection: wait 10 seconds before next video
                    console.log("Waiting 10 seconds to avoid YouTube rate limits...");
                    await new Promise(resolve => setTimeout(resolve, 10000));

                } catch (err) {
                    console.error(`Error processing video ${url}:`, err);
                    results.push({ url: url, error: err.message });
                }
            }

            // Truncate data to avoid Excel content errors (max 32767 chars)
            const MAX_CELL_LENGTH = 32000;
            const safeResults = results.map(row => {
                const newRow = {};
                for (const [key, value] of Object.entries(row)) {
                    if (typeof value === 'string' && value.length > MAX_CELL_LENGTH) {
                        // console.warn(`Truncating column ${key} as it exceeds Excel limits.`);
                        newRow[key] = value.substring(0, MAX_CELL_LENGTH) + '...[TRUNCATED]';
                    } else {
                        newRow[key] = value;
                    }
                }
                return newRow;
            });

            // Generate Excel
            const wb = xlsx.utils.book_new();
            const ws = xlsx.utils.json_to_sheet(safeResults);
            xlsx.utils.book_append_sheet(wb, ws, "Reviews");

            const resultDir = path.join(__dirname, '../data');
            if (!fs.existsSync(resultDir)) {
                fs.mkdirSync(resultDir, { recursive: true });
            }

            const resultPath = path.join(resultDir, `${jobId}.xlsx`);
            xlsx.writeFile(wb, resultPath);

            queueService.updateJob(jobId, {
                status: 'completed',
                items: results,
                resultPath: resultPath
            });

            console.log(`Job completed: ${jobId}`);
            jobId = queueService.getNextJob();
        }
    } catch (error) {
        console.error('Worker loop error:', error);
    } finally {
        isProcessing = false;
    }
};

module.exports = {
    processQueue
};
