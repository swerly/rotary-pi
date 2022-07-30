const childProcess = require('node:child_process');
var GPIO = require('onoff').Gpio;

var rotaryDial = new GPIO(27, 'in', 'rising', { debounceTimeout: 10 });
var rotarySwitch = new GPIO(22, 'in', 'both', { debounceTimeout: 10 });
var phoneHook = new GPIO(17, 'in', 'both', { debounceTimeout: 10 });

var rotaryCounter = 0;

if (!phoneHook.readSync()){ // on initialization, if phone is off hook we need to enable the rotary, otherwise the watch will catch it
    enableRotary();
}

phoneHook.watch((err, state) => {
    if (err) { //if an error
        console.error('There was a phoneHook error', err); //output error message to console
        return;
    }

    if (state){
        disableRotary();
    } else {
        enableRotary();
    }
});

function disableRotary(){
    console.log('rotary disabled');

    rotarySwitch.unwatchAll();
    rotaryDial.unwatchAll();
}


function enableRotary(){
    console.log('rotary enabled');
    var ignoreRotary = rotarySwitch.readSync();

    rotarySwitch.watch((err, state) => {
        if (err) { //if an error
            console.error('There was a rotarySwitch error', err); //output error message to console
            return;
        }
    
        if (state){
            rotaryCounter = 0;
        } else {
            if (ignoreRotary){
                ignoreRotary = false;
                console.log('ignoring rotary');
            } else {
                console.log(rotaryCounter);
            }
        }
    }); 

    rotaryDial.watch((err, state) => {
        if (err) { //if an error
            console.error('There was a rotaryDial error', err); //output error message to console
            return;
        }
    
        rotaryCounter ++;
    });
}

process.on('SIGINT', _ => {
    rotarySwitch.unexport();
    rotaryDial.unexport();
    phoneHook.unexport();
});