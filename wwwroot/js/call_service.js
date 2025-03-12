
let peerConnection;

const signalRConnection = new signalR.HubConnectionBuilder()
.withUrl("/chatHub")
.build();

let sipStack;

const localVideo = document.getElementById("localVideo");

const remoteVideo = document.getElementById("remoteVideo");

const status_value = document.getElementById("status");


function initializeSipClient() 
{   
    if (typeof SIPml === "undefined") {
        status_value.textContent = "SIPml5 library not loaded!";
        console.error("SIPml5 is not defined. Check script loading.");
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
        events_listener: { events: "*", listener: (e) => console.log(e) }
    });

    sipStack.start();
    
    status_value.textContent = "SIP client initialized here";

    signalRConnection.start()
        .then(() => console.log("SignalR Connected"))
        .catch(err => status_value.textContent = `SignalR error: ${err.message}`);
}

function initializeWebRTC(localVideoId, remoteVideoId) {
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

function startSipCall() {
    const hotline = document.getElementById("hotline").value;
    if (!hotline) {
        status_value.textContent = "Please enter a hotline.";
        return;
    }

    status_value.textContent = `Calling ${hotline}...`;
    callSession = sipStack.newSession("call-audio", {
        video_local: document.getElementById("localVideo"),
        video_remote: document.getElementById("remoteVideo"),
        audio_remote: document.createElement("audio"),
        events_listener: { 
            events: "*", 
            listener: (e) => {
                if (e.type === "connected") status_value.textContent = "Call connected!";
                if (e.type === "terminated") status_value.textContent = "Call ended.";
            }
        }
    });
    callSession.call(hotline);

    signalRConnection.invoke("InitiateCall", hotline)
        .catch(err => console.error("SignalR error:", err));
}

// window.startVideoCall = (hotline) => {
//     startCall(hotline);
// };

window.onload=()=>{
    initializeSipClient();};

// window.initializeWebRTC = () => initializeSipClient();

// window.startVideoCall = (hotline) => startSipCall(hotline);