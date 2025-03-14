function base64Data(data) {
    try {
        const dataString = typeof data === 'string' ? data : JSON.stringify(data);
        const encoded = encodeURIComponent(dataString).replace(/%([0-9A-F]{2})/g, (match, p1) => {
            return String.fromCharCode(parseInt(p1, 16));
        });
        return btoa(encoded);
    } catch (error) {
        console.error("Base64 encoding error:", error);
        return null;
    }
}
class MQTTClient {
    constructor() {
        this.client = new Paho.MQTT.Client(
            "videocall.vnpt.vn",
            Number("8081"),
            "" + Math.random().toString(20).substring(2, 8)
        );

        this.client.onConnectionLost = this.onConnectionLost.bind(this);
        this.client.onMessageArrived = this.onMessageArrived.bind(this);
    }

    connect() {
        const configMqtt = {
            useSSL: true,
            timeout: 3,
            keepAliveInterval: 15,
            cleanSession: true,
            reconnect: true,
            onSuccess: () => {
                console.log("MQTT Connected");
   
            },
            onFailure: (e) => {
                alert("MQTT Connection Failed: " + e.errorMessage);
            }
        };

        try {
            this.client.connect(configMqtt);
        } catch (error) {
            alert("Lỗi kết nối MQTT: " + error);
            console.error("Connection error:", error);
        }
    }

    subscribe(topic, qos = 0) {
        if (!this.client.isConnected()) {
            console.error("Cannot subscribe: MQTT client is not connected");
            return false;
        }

        try {
            this.client.subscribe(topic, {
                qos: qos,
                onSuccess: () => {
                    console.log(`Successfully subscribed to topic: ${topic}`);
                    return true;
                },
                onFailure: (error) => {
                    console.error(`Failed to subscribe to ${topic}: ${error.errorMessage}`);
                    return false;
                }
            });
            return true;
        } catch (error) {
            console.error("Subscription error:", error);
            return false;
        }
    }

    sendMessage(data, sipmlData) {
        if (!this.client.isConnected()) {
            console.error("MQTT client is not connected");
            return;
        }

        try {
            let timestamp = Math.floor(new Date().getTime() / 1000);

            const messageData = {
                ...data,
                time: timestamp
            };

            console.log("Message data:", messageData);

            // Convert to JSON string and encode
            const jsonString = JSON.stringify(messageData);
            const encodedData = base64Data(jsonString); // Assuming base64Data is defined elsewhere

            if (!encodedData) {
                console.log("Failed to encode message data");
                throw new Error("Failed to encode message data");
            }
            const temp_topic=`UCC/VCall/${sipmlData.sipml.impi}`;
            const message = new Paho.MQTT.Message(encodedData);
            message.destinationName =sipmlData.sipml.impi;
            message.qos = 0;

            this.client.send(message);
            console.log(`Message sent to ${message.destinationName}`);
            
            return encodedData;
        } catch (error) {
            console.error("Error sending message:", error);
            return null;
        }
    }

    onConnectionLost(responseObject) {
        if (responseObject.errorCode !== 0) {
            console.error("MQTT Connection Lost:", responseObject.errorMessage);
        }
    }

    onMessageArrived(message) {
        var jsonRv = JSON.parse(atob(message.payloadString));
        console.log("onMessageArrived " + JSON.stringify(jsonRv));
        if(jsonRv.signal=='res_customer_info' && jsonRv.dest=='customer')
        {
           console.log('send pong back');
           
const j = 
{
    sipml: {
        impi: "ios-vtttuyenlxn_agg-d8b4930a-cb17-45d3-8d8d-c2722ab60458" // Replace with your actual SIP identifier
    }
};  
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
                "request_id": "dfaa71cb-6bd0-4449-acc5-306359fb1194"
            }
        }
    };

    this.sendMessage(messageData, j);

 }

    }
}
