
let peerConnection;

const signalRConnection = new signalR.HubConnectionBuilder()
.withUrl("/chatHub")
.build();


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

    videoTrack.enabled = isCameraOn; // Toggle local video track

    callSession.mute('video', !isCameraOn);

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

    callSession.mute('audio',!isVoiceOn);    

    voiceBtn.classList.toggle("off", !isVoiceOn);

    voiceBtn.innerHTML = isVoiceOn 
        ? '<i class="bi bi-mic-fill me-1"></i> Voice' 
        : '<i class="bi bi-mic-mute-fill me-1"></i> Voice';
    status_value.textContent = `Voice ${isVoiceOn ? "on" : "off"}`;    
}

async function initializeSipClient() 
{   
    if (typeof SIPml === "undefined") {
        status_value.textContent = "SIPml5 library not loaded!";
        console.error("SIPml5 is not defined. Check script loading.");
        return;
    }

    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
        status_value.textContent = "Camera preview enabled";
    } catch (err) {
        status_value.textContent = "Failed to access camera: " + err.message;
        console.error(err);
        return;
    }

    sipStack = new SIPml.Stack(
    {
        realm: "vcc.vnpt.vn",
        impi: "ios-dfdf-3bea51c7-37f3-4b99-aae4-c800710e5f34",
        impu: "sip:ios-dfdfd-3bea51c7-37f3-4b99-aae4-c800710e5f34@vcc.vnpt.vn:5060",
        password: "ZVI9N1oEFWhDtCr1",
        display_name: "dfdf",
        websocket_proxy_url: "wss://vcc.vnpt.vn:4443/ws",
        enable_rtcweb_breaker: false,
        events_listener: onSipEventStack,
        sip_headers: [{ name: "User-Agent", value: "dart-sip-ua v0.2.2" }]
    });

    sipStack.start();
    
    status_value.textContent = "SIP client initialized here";

    signalRConnection.start()
        .then(() => console.log("SignalR Connected"))
        .catch(err => status_value.textContent = `SignalR error: ${err.message}`);
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
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }] // Add TURN if needed
    });

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            document.getElementById(localVideoId).srcObject = stream;
            stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
        })
        .catch(err => console.error("Media error:", err));

    peerConnection.ontrack = (event) => {
        document.getElementById(remoteVideoId).srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
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
    signalRConnection.invoke("InitiateCall", hotline); // Trigger backend logic
}

function onSipEventSession(e) {
    switch (e.type) {
        case "connecting":
            status_value.textContent = "Call connecting...";
            break;
        case "connected": 
        status_value.textContent = "Call connected!"; 
            endCallBtn.disabled = false;
            cameraBtn.disabled = false;
            voiceBtn.disabled = false;
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
            // Keep localStream active for preview after call ends
            break;
        case "i_ao_request":
            if (e.getSipResponseCode() === 180) status_value.textContent = "Ringing...";
            break;
    }
}
function startSipCall() 
{
    const hotline = document.getElementById("hotline").value;    
    
    if (!hotline) {
        status_value.textContent = "Please enter a hotline.";
        return;
    }

    status_value.textContent = `Calling ${hotline}...`;

    callSession = sipStack.newSession("call-audio", 
    {
        video_local: localVideo,
        video_remote: remoteVideo,
        audio_remote: document.createElement("audio"),
        events_listener: 
        { 
            events: "*", 
            listener:onSipEventSession
        }
    });

    callSession.call(hotline);

    signalRConnection.invoke("InitiateCall", hotline)
        .catch(err => console.error("SignalR error:", err));
}

function endCall() 
{
    if (callSession) {
        callSession.hangup();
        endCallBtn.disabled = true;
        callSession = null;
    }
}

// window.startVideoCall = (hotline) => {
//     startCall(hotline);
// };

window.onload=()=>{
    initializeSipClient();};

// window.initializeWebRTC = () => initializeSipClient();

// window.startVideoCall = (hotline) => startSipCall(hotline);