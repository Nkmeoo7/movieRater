const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const downloadAudio = (url, outputDir) => {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const fileNameTemplate = '%(id)s.%(ext)s';

        console.log(`Downloading audio from ${url}...`);

        const process = spawn('yt-dlp', [
            '-x',
            '--audio-format', 'mp3',
            '-o', path.join(outputDir, fileNameTemplate),
            url
        ]);

        let stdoutData = '';
        let stderrData = '';
        let downloadedId = '';

        process.stdout.on('data', (data) => {
            const output = data.toString();
            stdoutData += output;
            // Try to catch the file name or ID from output if needed, 
            // but usually we rely on the ID being in the filename.
            // regex to extract ID from [youtube] <ID>: Downloading...
        });

        process.stderr.on('data', (data) => {
            stderrData += data.toString();
        });

        process.on('close', (code) => {
            if (code === 0) {
                // Find the file. yt-dlp uses video ID. 
                // We need to know the video ID to find the file.
                // Or we can list files in the dir and sort by time, but that's risky for parallel.
                // Better approach: use --print filename to get the filename first?
                // Or just trust consistency.

                // Let's assume we can get the ID from the URL or the process output.
                // Simple extraction from URL:
                let videoId = '';
                try {
                    const urlObj = new URL(url);
                    if (urlObj.hostname.includes('youtu.be')) {
                        videoId = urlObj.pathname.slice(1);
                    } else {
                        videoId = urlObj.searchParams.get('v');
                    }
                } catch (e) {
                    // Fallback or fail
                }

                // If it's a playlist item or complex URL, this might fail.
                // A more robust way is to ask yt-dlp for the filename.

                // Construct path
                const expectedPath = path.join(outputDir, `${videoId}.mp3`);
                resolve(expectedPath);
            } else {
                reject(new Error(`yt-dlp exited with code ${code}: ${stderrData}`));
            }
        });
    });
};

const getVideoId = async (url) => {
    // Helper to get ID using yt-dlp --print id
    return new Promise((resolve, reject) => {
        const ytDlpPath = path.join(__dirname, '../venv/bin/yt-dlp');
        const args = ['--print', 'id', url];

        if (process.env.BROWSER_FOR_COOKIES) {
            args.push('--cookies-from-browser', process.env.BROWSER_FOR_COOKIES);
        }

        console.log(`[mn] Getting Video ID for: ${url}`);
        const ytProcess = spawn(ytDlpPath, args);

        let output = '';
        let errorOutput = '';

        ytProcess.stdout.on('data', d => {
            const str = d.toString();
            console.log(`[yt-dlp ID stdout]: ${str}`);
            output += str;
        });

        ytProcess.stderr.on('data', d => {
            const str = d.toString();
            console.log(`[yt-dlp ID stderr]: ${str}`);
            errorOutput += str;
        });

        ytProcess.on('close', code => {
            if (code === 0) resolve(output.trim());
            else reject(new Error(`Failed to get info: ${errorOutput}`));
        });
    });
}

// Improved version that gets filename first
const downloadAudioRobust = async (url, outputDir) => {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Get ID first to predict filename
    const id = await getVideoId(url);
    const outputPath = path.join(outputDir, `${id}.mp3`);

    // Check if already exists to skip download? Maybe.
    if (fs.existsSync(outputPath)) {
        console.log(`File ${outputPath} already exists. Skipping download.`);
        return outputPath;
    }

    return new Promise((resolve, reject) => {
        const ytDlpPath = path.join(__dirname, '../venv/bin/yt-dlp');
        const args = [
            '-x',
            '--audio-format', 'mp3',
            '--no-playlist',
            '-o', path.join(outputDir, '%(id)s.%(ext)s'),
            url
        ];

        if (process.env.BROWSER_FOR_COOKIES) {
            args.push('--cookies-from-browser', process.env.BROWSER_FOR_COOKIES);
        }

        const ytProcess = spawn(ytDlpPath, args);

        ytProcess.stdout.on('data', (data) => {
            console.log(`[yt-dlp stdout]: ${data}`);
        });

        ytProcess.stderr.on('data', (data) => {
            console.log(`[yt-dlp stderr]: ${data}`);
        });

        ytProcess.on('error', (err) => {
            reject(new Error(`Failed to start yt-dlp: ${err.message}`));
        });

        ytProcess.on('close', (code) => {
            if (code === 0) {
                if (fs.existsSync(outputPath)) {
                    resolve(outputPath);
                } else {
                    reject(new Error(`Download finished but file not found at ${outputPath}`));
                }
            } else {
                reject(new Error(`yt-dlp failed with code ${code}`));
            }
        });
    });
};


module.exports = {
    downloadAudio: downloadAudioRobust
};
