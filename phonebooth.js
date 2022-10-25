const fs = require('fs');
const path = require('path');
const childProcess = require('node:child_process');
var GPIO = require('onoff').Gpio;

var phoneHook = new GPIO(17, 'in', 'both', { debounceTimeout: 10 });
var rotaryDial = new GPIO(27, 'in', 'rising', { debounceTimeout: 10 });
var rotarySwitch = new GPIO(22, 'in', 'both', { debounceTimeout: 10 });

var recorder;

var rotaryCounter = 0;

if (!phoneHook.readSync()) { // on initialization, if phone is off hook we need to enable the rotary
    enableRotaryListener();
}

phoneHook.watch((err, state) => {
    if (err) {
        console.error('There was a phoneHook error', err);
        return;
    }

    if (state) { // phone was put back on the hook
        stopRecording();
        disableRotaryListener();
    } else {
        enableRotaryListener();
    }
});

process.on('SIGINT', _ => {
    rotarySwitch.unexport();
    rotaryDial.unexport();
    phoneHook.unexport();
});

function disableRotaryListener() {
    console.log('rotary disabled');

    rotarySwitch.unwatchAll();
    rotaryDial.unwatchAll();
}

function enableRotaryListener() {
    console.log('rotary enabled');
    var ignoreRotary = rotarySwitch.readSync(); // check if the dial is currently spinning when handset is pulled off hook

    rotarySwitch.watch((err, state) => {
        if (err) { //if an error
            console.error('There was a rotarySwitch error', err); //output error message to console
            return;
        }

        if (state) {
            rotaryCounter = 0;
        } else {
            if (ignoreRotary) { // dial was spinning when handset picked up
                ignoreRotary = false;
                console.log('ignoring rotary');
            } else {
                console.log('number dialed: ' + rotaryCounter);
                numberDialed(rotaryCounter);
            }
        }
    });

    rotaryDial.watch((err, state) => {
        if (err) { //if an error
            console.error('There was a rotaryDial error', err); //output error message to console
            return;
        }

        rotaryCounter++;
    });
}

function getDateStr() {
    let date = new Date();
    let m = formatField(date.getMonth() + 1);
    let d = formatField(date.getDate());
    let hh = formatField(date.getHours());
    let mm = formatField(date.getMinutes());
    let ss = formatField(date.getSeconds());
    return m + '-' + d + '_' + hh + ':' + mm + ':' + ss;

    function formatField(val) {
        return (0 + val.toString()).slice(-2);
    };
};

function numberDialed(dialed) {
    if (dialed == 1) {
        childProcess.exec('aplay intro.wav', startRecording);
    }

    if (dialed == 2) {
        playMostRecentRecording();
    }
}

function startRecording() {
    var args = ['-f', 'alsa', '-ar', '48000', '-ac', 1, '-i', 'plughw:1,0', '-acodec', 'flac', './recordings/' + getDateStr() + '.flac'];
    console.log('starting recording...');
    recorder = childProcess.spawn('ffmpeg', args);
}

function stopRecording() {
    if (recorder) {
        recorder.kill('SIGINT');
        console.log('stopping recording...');
        recorder = null;
    }
}

function playMostRecentRecording() {
    console.log('starting playback');
    var mostRecentFile = getMostRecentFile('./recordings/');
    var fileName = mostRecentFile.file;

    var toRun = 'flac -c -d ./recordings/' + fileName + ' | aplay';
    console.log(toRun);
    childProcess.exec(toRun, () => console.log());   
}

function getMostRecentFile(dir) {
    const files = orderReccentFiles(dir);
    return files.length ? files[0] : undefined;
};

function orderReccentFiles(dir) {
    return fs.readdirSync(dir)
        .filter((file) => fs.lstatSync(path.join(dir, file)).isFile())
        .map((file) => ({ file, mtime: fs.lstatSync(path.join(dir, file)).mtime }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
};