const childProcess = require('node:child_process');
var GPIO = require('onoff').Gpio;
var recordPath = './recordings/';
var recorder;
var fileCount = 0;

var phoneHook = new GPIO(17, 'in', 'both', { debounceTimeout: 10 });

process.on('SIGINT', _ => {
    phoneHook.unexport();
});

phoneHook.watch((err, state) => {
    if (err) { //if an error
        console.error('There was a phoneHook error', err); //output error message to console
        return;
    }

    if (state) {
        startRecording();
    } else {
        stopRecording();
    }
});

function startRecording(){
    var args = ['-f', 'alsa', '-ar', '48000', '-ac', 1, '-i', 'plughw:1,0', '-acodec', 'flac', './recordings/t' + fileCount + '.flac'];
    console.log('starting recording...');
    recorder = childProcess.spawn('ffmpeg', args);
}

function stopRecording() {
    recorder.kill('SIGINT');
    console.log('stopping recording...');
    fileCount++;
}
// ffmpeg -f alsa -ar 48000 -ac 1 -i plughw:1,0 -acodec flac fs.flac