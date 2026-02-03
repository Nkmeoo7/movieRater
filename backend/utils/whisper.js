const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const transcribe = (audioPath) => {
    return new Promise((resolve, reject) => {
        const outputDir = path.dirname(audioPath);

        console.log(`Transcribing ${audioPath}...`);

        // Assuming 'whisper' command is available in PATH
        // If using a specific python env, this needs adjustment
        // Command: whisper audioPath --model base --output_dir outputDir --output_format txt

        const whisperPath = path.join(__dirname, '../venv/bin/whisper');

        const process = spawn(whisperPath, [
            audioPath,
            '--model', 'base', // 'base' is a good trade-off
            '--output_dir', outputDir,
            '--output_format', 'txt'
        ]);

        let stderrData = '';

        process.stderr.on('data', (data) => {
            const msg = data.toString();
            console.log(`[Whisper]: ${msg}`);
            // Whisper prints progress to stderr
        });

        process.on('error', (err) => {
            reject(new Error(`Failed to start whisper: ${err.message}`));
        });

        process.on('close', (code) => {
            if (code === 0) {
                // Construct expected output filename
                // Whisper appends extension to the filename, replacing the old extension or just appending?
                // Usually it replaces extension with .txt if input has extension
                const baseName = path.basename(audioPath, path.extname(audioPath));
                const txtPath = path.join(outputDir, `${baseName}.txt`);

                if (fs.existsSync(txtPath)) {
                    const transcript = fs.readFileSync(txtPath, 'utf-8');
                    resolve(transcript);
                } else {
                    reject(new Error(`Transcription finished but file not found at ${txtPath}`));
                }
            } else {
                reject(new Error(`Whisper exited with code ${code}: ${stderrData}`));
            }
        });
    });
};

module.exports = {
    transcribe
};
