// In-memory store
const jobs = {}; // jobId -> Job Object
const queue = []; // List of jobIds waiting

const fileSystem = require('fs');
const path = require('path');

const addJob = (jobId, urls) => {
    const job = {
        id: jobId,
        urls: urls,
        status: 'queued', // queued, processing, completed, failed
        progress: {
            current: 0,
            total: 0 // Will be set after expansion
        },
        items: [], // Individual video results
        createdAt: new Date(),
        resultPath: null
    };

    jobs[jobId] = job;
    queue.push(jobId);

    // Trigger worker (async)
    // In a real system, this would be an event or separate process
    // Here we'll just ensure the worker loop is running
    require('./worker').processQueue();

    return job;
};

const getJob = (jobId) => {
    return jobs[jobId];
};

const updateJob = (jobId, updates) => {
    if (jobs[jobId]) {
        jobs[jobId] = { ...jobs[jobId], ...updates };
    }
};

const getJobResultPath = (jobId) => {
    const job = jobs[jobId];
    if (job && job.status === 'completed' && job.resultPath) {
        return job.resultPath;
    }
    return null;
};

const getNextJob = () => {
    if (queue.length > 0) {
        return queue.shift();
    }
    return null;
};

module.exports = {
    addJob,
    getJob,
    updateJob,
    getJobResultPath,
    getNextJob
};
