

let peerConnection;

const signalRConnection = new signalR.HubConnectionBuilder()
.withUrl("/chatHub")
.build();



function getMessageData()
{

    const now = new Date();
const timestampSec2 = Math.floor(now.getTime() / 1000);
    const messageData = {
        "dest": "callcenter",
        "signal": "res_customer_info",
        "type_call": "video",
        "time": timestampSec2,
        "data": {
            "name": "0919262555",
            "call_id": "ios-dfdf-3bea51c7-37f3-4b99-aae4-c800710e5f34-1729160226000",
            "sip_call_id": "092805fa-0f34-4067-af8b-bc8291613260",
            "data_options": {
                "msisdn": "0919262555",
                "request_id": "dfaa71cb-6bd0-4449-accfe448-306359fb1194"
            }
        }
    };

    return messageData;
}


const j = {
    sipml: {
        impi: "ios-vtttuyenlxn_agg-d8b4930a-cb17-45d3-8d8d-c2722ab60458" // Replace with your actual SIP identifier
    }
};



let sipStack;

let callSession;

let localStream;

const localVideo = document.getElementById("localVideo");


const remoteVideo = document.getElementById("remoteVideo");


const status_value = document.getElementById("status");


const endCallBtn = document.getElementById("endCallBtn");


const cameraBtn = document.getElementById("cameraBtn");


const voiceBtn = document.getElementById("voiceBtn");


let isCameraOn = true;


let isVoiceOn = true;

const mqttClient = new MQTTClient();



function toggleCamera()
{
    const videoTrack = localStream.getVideoTracks()[0];

    if (!videoTrack) return;

    if (!callSession) 
    {
        status_value.textContent = "No active call to toggle camera.";
        
        return;
    }

    isCameraOn=!isCameraOn;

    videoTrack.enabled = isCameraOn;

    cameraBtn.classList.toggle('off',!isCameraOn);

    cameraBtn.innerHTML = isCameraOn 
        ? '<i class="bi bi-camera-video-fill me-1"></i> Camera' 
        : '<i class="bi bi-camera-video-off-fill me-1"></i> Camera';
    status_value.textContent = `Camera ${isCameraOn ? "on" : "off"}`;
}

function toggleVoice()
{

    if(!callSession)
    {
        status_value.textContent = "No active call to toggle voice.";

        return;
    }

    const audioTrack = localStream.getAudioTracks()[0];    

    if(!audioTrack) return;

    isVoiceOn=!isVoiceOn;

    audioTrack.enabled=isVoiceOn;

    voiceBtn.classList.toggle("off", !isVoiceOn);

    voiceBtn.innerHTML = isVoiceOn 
        ? '<i class="bi bi-mic-fill me-1"></i> Voice' 
        : '<i class="bi bi-mic-mute-fill me-1"></i> Voice';

    status_value.textContent = `Voice ${isVoiceOn ? "on" : "off"}`;    

}

async function initializeSipClient() 
{   
    if (typeof SIPml === "undefined") 
    {
        status_value.textContent = "SIPml5 library not loaded!";
        console.error("SIPml5 is not defined. Check script loading.");
        return;
    }

    try 
    {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
        status_value.textContent = "Camera preview enabled";
    } catch (err) 
    {
        status_value.textContent = "Failed to access camera: " + err.message;
        console.error(err);
        return;
    }

   await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => console.log("Permissions granted"))
    .catch(error => console.error("Permission denied:", error));


    mqttClient.connect();


   setTimeout(()=>{
    mqttClient.subscribe("UCC/VCall/ios-vtttuyenlxn_agg-d8b4930a-cb17-45d3-8d8d-c2722ab60458");

    // mqttClient.sendMessage("data",j);

},2000);



// mqttClient.setMessageCallback((message) => {
//     console.log('Received message:', message);
//     console.log('Topic:', message.topic);
//     console.log('Data:', message.data);
//     const now = new Date();
// const timestampSec2 = Math.floor(now.getTime() / 1000);
//     const messageData = {
//         "dest": "callcenter",
//         "signal": "ping/pong",
//         "type_call": "video",
//         "time": timestampSec2,
//         "data": {
//             "name": "0919262555",
//             "call_id": "ios-dfdf-3bea51c7-37f3-4b99-aae4-c800710e5f34-1729160226000",
//             "sip_call_id": "092805fa-0f34-4067-af8b-bc8291613260",
//             "data_options": {
//                 "msisdn": "0919262555",
//                 "request_id": "dfaa71cb-6bd0-4449-acc5-306359fb1194"
//             }
//         }
//     };

//     const encodedResult = mqttClient.sendMessage(messageData, j);
//     });

    sipStack = new SIPml.Stack({
        realm: "vcc.vnpt.vn",
        impi: "ios-vtttuyenlxn_agg-d8b4930a-cb17-45d3-8d8d-c2722ab60458",
        impu: "sip:ios-vtttuyenlxn_agg-d8b4930a-cb17-45d3-8d8d-c2722ab60458@vcc.vnpt.vn:5060",
        password: "Anb07vl2YGy5BpQH",
        display_name: "vtttuyen1_vtag",
        websocket_proxy_url: "wss://vcc.vnpt.vn:4443/ws",
        outbound_proxy_url: null,
        ice_servers: null,
        enable_rtcweb_breaker: false,
        events_listener: { events: "*", listener: onSipEventStack },
        enable_early_ims: true,
        enable_media_stream_cache: false,
        bandwidth: null,
        video_size: null,
        sip_headers: [{ name: "User-Agent", value: "dart-sip-ua v0.2.2" }]
    });

    // sipStack = new SIPml.Stack({
    //     realm: "vcc.vnpt.vn",
    //     impi: "pAmb7pQRUAMiSEDk", // Using hashinfo as impi (assumption)
    //     impu: "sip:pAmb7pQRUAMiSEDk@vcc.vnpt.vn:5060", // Constructed from hashinfo and domain
    //     password: null, // Not provided in JSON; must be added if required
    //     display_name: null, // Not provided; optional
    //     websocket_proxy_url: "wss://vcc.vnpt.vn:4443/ws",
    //     outbound_proxy_url: "", // Empty string as per sip_outboundproxy_url
    //     ice_servers: [], // Empty array as per "[]"
    //     enable_rtcweb_breaker: false,
    //     events_listener: { events: "*", listener: onSipEventStack }, // Assumed for completeness
    //     enable_early_ims: true, // Inverted from disable_early_ims: "false"
    //     enable_media_stream_cache: false, // From enable_media_caching: "false"
    //     bandwidth: null, // Empty string interpreted as null
    //     video_size: null, // Empty string interpreted as null
    //     sip_headers: [{ name: "User-Agent", value: "dart-sip-ua v0.2.2" }], // Carried over from prior context
    //     enable_debug: true // Inverted from disable_debug: "false"
    // });

    sipStack.start();
    
    status_value.textContent = "SIP client initialized here";

    // signalRConnection.start()
    //     .then(() => console.log("SignalR Connected"))
    //     .catch(err => status_value.textContent = `SignalR error: ${err.message}`);
}

function onSipEventStack(e) {
    switch (e.type) 
    {
        case "started": 
            status_value.textContent = "SIP client started"; 
            break;
        case "failed_to_start": 
            status_value.textContent = "SIP client failed: " + e.description; 
            break;
    }
}



function initializeWebRTC(localVideoId, remoteVideoId) 
{
    signalRConnection = new signalR.HubConnectionBuilder()
        .withUrl("/chatHub")
        .build();

    peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }] 
    });

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            document.getElementById(localVideoId).srcObject = stream;
            stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
        })
        .catch(err => console.error("Media error:", err));

    peerConnection.ontrack = (event) => 
    {
        document.getElementById(remoteVideoId).srcObject = event.streams[0];
        
    };

    peerConnection.onicecandidate = (event) => 
    {
        if (event.candidate) 
        {
            signalRConnection.invoke("SendIceCandidate", "vnpt-endpoint", JSON.stringify(event.candidate));
        }
    };

    signalRConnection.on("ReceiveOffer", async (senderId, sdpOffer) => {
        await peerConnection.setRemoteDescription(JSON.parse(sdpOffer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        signalRConnection.invoke("SendAnswer", senderId, JSON.stringify(answer));
    });

    signalRConnection.on("ReceiveAnswer", async (senderId, sdpAnswer) => {
        await peerConnection.setRemoteDescription(JSON.parse(sdpAnswer));
    });

    signalRConnection.on("ReceiveIceCandidate", async (senderId, candidate) => {
        await peerConnection.addIceCandidate(JSON.parse(candidate));
    });

    signalRConnection.on("CallInitiated", (message) => {
        console.log(message);
    });

    signalRConnection.start().then(() => console.log("SignalR Connected"));
}

async function startCall(hotline) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    signalRConnection.invoke("SendOffer", "vnpt-endpoint", JSON.stringify(offer));
    signalRConnection.invoke("InitiateCall", hotline); 
}

async function onSipEventSession(e) 
{
    switch (e.type) {
        case "connecting":
            status_value.textContent = "Call connecting...";
            endCallBtn.disabled = false;
            break;
        case "connected": 
        status_value.textContent = "Call connected!"; 
            endCallBtn.disabled = false;
            cameraBtn.disabled = false;
            voiceBtn.disabled = false;
            console.log("Local Video Tracks:", localVideo.srcObject?.getVideoTracks());

            console.log("Remote Video Tracks:", remoteVideo.srcObject?.getVideoTracks());

            console.log("Remote Audio Tracks:", remoteVideo.srcObject?.getAudioTracks());

            // console.log("Local Audio Tracks:", document.getElementById("remoteAudio").srcObject?.getAudioTracks());

            break;
        case "terminated": 
        status_value.textContent = "Call ended"; 
            endCallBtn.disabled = true;
            cameraBtn.disabled = true;
            voiceBtn.disabled = true;
            cameraBtn.classList.remove("off");
            voiceBtn.classList.remove("off");
            isCameraOn = true;
            isVoiceOn = true;
            callSession = null;
            break;
        case "i_ao_request":
            if (e.getSipResponseCode() === 180) status_value.textContent = "Ringing...";
            break;
        case "m_stream_video_local_added":
            console.log("Local Stream Added");
            break;
        case "m_stream_video_remote_added":
            console.log("Remote Stream Added");
            break;
        case "m_stream_audio_local_added":
            console.log("Local Audio Stream Added");
            break;
        case "m_stream_audio_remote_added":
            // console.log("Remote media tracks:", callSession.oSipSessionCall.getRemoteStreams());
            console.log("Remote audio added:", e);
            // console.log("Remote audio stream added:", e.stream);

            const remoteAudioElement = document.getElementById("remoteAudio");
console.log("Remote Audio Element:", remoteAudioElement);
console.log("Assigned Stream:", remoteAudioElement ? remoteAudioElement.srcObject : "No srcObject assigned");
console.log("here");
console.log("event value",e);
if(e.session)
    {
      console.log("there is session",e.session);

    }
    if(!remoteAudioElement.srcObject)
    {
        console.log("No srcObject assigned");
    }
    else{
        console.log("srcObject assigned");
        remoteAudio.play().catch(err => console.error("Failed to play audio:", err));
    }
      // Attempt to get remote streams from WebRTC PeerConnection
            break;
        default:
            console.log("Other Stream Event:",e.type);
            break;
    }
}
function startSipCall() 
{
    const hotline = document.getElementById("hotline").value;
    
    
    if(!hotline) 
    {
        status_value.textContent = "Please enter a hotline.";
        return;
    }

    status_value.textContent = `Calling ${hotline}...`;
     
    localVideo.muted = true;    

    callSession = sipStack.newSession("call-audio", 
    {   
        video_local:  document.getElementById("localVideo"),
        video_remote: document.getElementById("remoteVideo"),
        audio_remote: document.getElementById("remoteAudio"),
        bandwidth: {  audio: 50, video: 256},
        video_size:{minWidth:640,minHeight:480,maxWidth:1280,maxHeight:720},
        screencast_window_id: 0,
        events_listener: 
        { 
            events: "*", 
            listener:onSipEventSession
        },
        sip_caps:[{name:"+g.oma.sip-im"},{name:"language",value:"'en,fr'"}]
    });


    navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 }, 
        audio: true
    }).then(stream => {
        localVideo.srcObject = stream;
        callSession.call(hotline);
    }).catch(error => console.error("Error getting media:", error));

    // const encodedResult = mqttClient.sendMessage(getMessageData(), j);
    // if (encodedResult) {
    //     console.log("Encoded data sent:", encodedResult);
    // }
    

    // signalRConnection.invoke("InitiateCall", hotline)
    //     .catch(err => console.error("SignalR error:", err));
}

function endCall() 
{
    if (callSession) {
        callSession.hangup();
        endCallBtn.disabled = true;
        callSession = null;
    }
}

async function postData(entry_point,data)
{
  await axios.post(entry_point,data)
  .then(response => {
    alert(response.message);
  })
}

// window.startVideoCall = (hotline) => {
//     startCall(hotline);
// };

window.onload=()=>{
    initializeSipClient();};

// window.initializeWebRTC = () => initializeSipClient();

// window.startVideoCall = (hotline) => startSipCall(hotline);