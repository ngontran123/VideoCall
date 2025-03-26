// const { stat } = require("node:fs/promises");



const localVideo = document.getElementById("localVideo");


const remoteVideo = document.getElementById("remoteVideo");


const status_value = document.getElementById("status");


const endCallBtn = document.getElementById("endCallBtn");


const cameraBtn = document.getElementById("cameraBtn");


const voiceBtn = document.getElementById("voiceBtn");


const ringTone = document.getElementById("ringTone");

let isCameraOn = true;

let isVoiceOn = true;

let url_param = new URLSearchParams(window.location.search);

let get_data = url_param.get('data');

let ua=null;

let currentSession = null;

let hotline='';

async function initializeSipClient() 
{

console.log("Used to be in this init");
var entry_point = 'https://portal-ccbs.mobimart.xyz/api/get-data';
    
var data_hash = get_data;

var data =
{
    'data': data_hash
};

var response = await postData(entry_point, data);

var data = response.data;

if(data.error_code==0)
 {
        status_value.textContent = "Failed to get SIP Info";

        return;        
}

var message = response.message;

var data_obj = data.data;

hotline = data_obj.hotline;



var socket = new JsSIP.WebSocketInterface(data_obj.websocket_server_url);

var configuration = {
    sockets  : [ socket ],
    uri      : data_obj.impu,
    password : data_obj.password,
    display_name: data_obj.display_name,
    session_timers: false
  };
  

const mqttClient = new MQTTClient(data_obj.call_id, data_obj.sip_call_id, data_obj.request_id, data_obj.phone, data_hash);

mqttClient.connect();

setTimeout(() => {
    mqttClient.subscribe(`UCC/VCall/${data_obj.call_id}`);
}, 3000);


try
{
ua = new JsSIP.UA(configuration);
}
catch(error)
{
    console.log("Error initializing sip client: "+error);
    return;
}

ua.on('connected', () => {

    status_value.innerHTML = 'Connected to Sip Server';

    console.log('Connected to SIP server');
    
    cameraBtn.disabled = false;

    voiceBtn.disabled = false;

    endCallBtn.disabled = false;
});

ua.on('disconnected', () => {
    status_value.innerHTML = 'Disconnected Sip Server';

    console.error('Disconnected from SIP server');
});

ua.on('registered', () => {
    status_value.innerHTML = 'Registered';

    console.log('Registered with SIP server');
});

ua.on('unregistered', () => {
    status_value.innerHTML = 'Unregistered';
    console.log('Unregistered from SIP server');
});

ua.on('registrationFailed', (data) => {
    console.error('Registration failed:', data.cause);
    alert('SIP registration failed: ' + data.cause);
});

ua.on('newRTCSession', (data) => {
    const session = data.session;
    
    currentSession = session;

    // Handle incoming/outgoing call
    if (session.direction === 'outgoing') {
        
        status_value.innerHTML = 'Outgoing call initiated';

        startRingTone();
        
        console.log('Outgoing call initiated');
    } else {
        console.log('Incoming call from:', session.remoteIdentity.uri.toString());
        session.answer({
            mediaConstraints: { audio: true, video: true },
            pcConfig: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun.counterpath.net:3478' }
                ]
            }
        });

    status_value.innerHTML = 'Incoming call from: ' + session.remoteIdentity.uri.toString();
    }

    // Handle call events
    session.on('progress', () => {
        status_value.innerHTML="Call is in progress";
        console.log('Call is in progress');
    });

    session.on('accepted', () => {
        stopRingTone();
        status_value.innerHTML="Call is in accepted";
        console.log('Call accepted');
    });

    session.on('failed', (data) => {
        status_value.innerHTML="Call is failed";
        console.error('Call failed:', data);
        currentSession = null;
    });

    session.on('ended', () => {

        stopRingTone();

        status_value.innerHTML="Call Ended";

        console.log('Call ended');
        
        currentSession = null;
        
        hangupBtn.disabled = true;
        
        localVideo.srcObject = null;
        
        remoteVideo.srcObject = null;
    });

    session.on('confirmed', () => {

        status_value.innerHTML="Call is confirmed";

        const pc = session.connection;

        const localStream = pc.getLocalStreams()[0];

        const remoteStream = pc.getRemoteStreams()[0];
        
        if (localStream) 
        {
            localVideo.srcObject = localStream;
        }
        
        document.getElementById("remoteVideo").srcObject = remoteStream;
        
        document.getElementById("remoteAudio").srcObject = remoteStream;
        
    });

    session.on('peerconnection', () => {
        
        const pc = session.connection;

        const localStream = pc.getLocalStreams()[0];
        
        if (localStream) 
        {
            localVideo.srcObject = localStream;
        }

        pc.onaddstream = (event) => {
            remoteVideo.srcObject = event.stream;
        };
    });
});
ua.start();
}


function startRingTone() {
    try {
        ringTone.play();
    }
    catch (e) {
        console.log('Play ringtone exception:' + e);
    }
}

function stopRingTone() {
    try {
        ringTone.pause();
    }
    catch (e) {
        console.log('Stop playing ringtone', e);
    }
}


function toggleCamera()
{
if(!currentSession)
{
    status_value.innerHTML = 'No active call session';
    
    return;
}

var localStream = currentSession.connection.getLocalStreams()[0];

   var videoObj=localStream.getVideoTracks()[0];

   if(!videoObj)
   {
    status_value.innerHTML = 'No video track found';
    return;
   }

   isCameraOn = !isCameraOn;

   videoObj.enabled = isCameraOn;

   cameraBtn.classList.toggle('off', !isCameraOn);

   cameraBtn.innerHTML = isCameraOn
       ? '<i class="bi bi-camera-video-fill me-1"></i> Camera'
       : '<i class="bi bi-camera-video-off-fill me-1"></i> Camera';

}

function toggleVoice()
{
if(!currentSession)
{
    status_value.innerHTML = 'No active call session';
    
    return;
}

var localStream = currentSession.connection.getLocalStreams()[0];

var audioObj = localStream.getAudioTracks()[0];
 
 if(!audioObj)
 {
    status_value.innerHTML = 'No audio track found';
    
    return;
 }
 
 isVoiceOn = !isVoiceOn;

 audioObj.enabled = isVoiceOn;

 voiceBtn.classList.toggle("off", !isVoiceOn);

 voiceBtn.innerHTML = isVoiceOn
     ? '<i class="bi bi-mic-fill me-1"></i> Voice'
     : '<i class="bi bi-mic-mute-fill me-1"></i> Voice';
}


// var eventHandlers = {
//   'progress': function(e) 
//   {
//     console.log('call is in progress');
//   },
//   'failed': function(e) {
//     console.log('call failed with cause: '+ e.data.cause);
//   },
//   'ended': function(e) {
//     console.log('call ended with cause: '+ e.data.cause);
//   },
//   'confirmed': function(e) 
//   {
//     console.log('call confirmed');
//   }
// };

function startSipCall()
{

    if (!ua.isRegistered()) 
    {
        status_value.innerHTML = 'SIP server not registered yet';
        
        return;
    }

    if(hotline=='')
    {
        status_value.innerHTML = 'Hotline number not found';
        return;
    }

    var options = {
        'mediaConstraints': { audio: true, video: true },
        'pcConfig':{
            'iceServers': 
            [
                {'urls': 'stun:stun.l.google.com:19302'},
                {'urls': 'stun:stun.counterpath.net:3478'}
            ]
        }
      };
      
      var session = ua.call(hotline, options);

      console.log('Call initiated to hotline: '+hotline);
}

function endCall()
{
    if(currentSession)
    {
        currentSession.terminate();

        currentSession=null;
        
        status_value.innerHTML = 'Call Ended';
    }
}

async function postData(entry_point, data) {
    var response = await axios.post(entry_point, data);
    return response;
}


window.onload = () => 
{
    initializeSipClient();
};
