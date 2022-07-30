const childProcess = require('node:child_process');
var GPIO = require('onoff').Gpio;
var redLed = new GPIO(4, 'out');
var blueLed = new GPIO(17, 'out');
var recordButton = new GPIO(27, 'in', 'rising', { debounceTimeout: 10 });
var playbackButton = new GPIO(22, 'in', 'rising', { debounceTimeout: 10 });

initialize();

process.on('startRecording', startRecording);

process.on('startPlayback', startPlayback);

process.on('SIGINT', _ => {
    redLed.writeSync(0);
    blueLed.writeSync(0);
    redLed.unexport();
    blueLed.unexport();
    recordButton.unexport();
    playbackButton.unexport();
});

function initialize() {
    watchInputs(true);
    setLed('blue');
}

function startRecording() {
    setLed('red');
    watchInputs(false);
    childProcess.exec('arecord -D plughw:1,0 -f S32_LE -r96000 --duration=10 test.wav', stopRecording);
}

function startPlayback() {
    setLed('red');
    watchInputs(false);
    childProcess.exec('aplay test.wav', stopPlayback);
}

function stopRecording(error, stdout, stderr) {
    if (error) {
        console.error('exec error: ${error}');
    }

    console.log('stdout: ' +  stdout);
    console.log('stdout: ' + stderr);

    setLed('blue');
    watchInputs(true);
}

function stopPlayback(error, stdout, stderr) {
    if (error) {
        console.error('exec error: ${error}');
    }

    console.log('stdout: ' +  stdout);
    console.log('stdout: ' + stderr);

    setLed('blue');
    watchInputs(true);
}

function watchInputs(enabled){
    watchRecording(enabled);
    watchPlayback(enabled);
}

function watchRecording(enabled) {
    if (enabled) {
        recordButton.watch((err, state) => {
            if (err) { //if an error
                console.error('There was an error', err); //output error message to console
                return;
            }

            process.emit('startRecording');
        });
    } else {
        recordButton.unwatchAll();
    }
}

function watchPlayback(enabled){
    if (enabled) {
        playbackButton.watch((err, state) => {
            if (err) { //if an error
                console.error('There was an error', err); //output error message to console
                return;
            }

            process.emit('startPlayback');
        });
    } else {
        playbackButton.unwatchAll();
    }
}

function setLed(state) {
    if (state == 'red') {
        redLed.writeSync(1);
        blueLed.writeSync(0);
    } else {
        redLed.writeSync(0);
        blueLed.writeSync(1);
    }
}