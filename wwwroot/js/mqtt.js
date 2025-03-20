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

     call_id;
    sip_call_id;
    request_id;
    phone;
    constructor(call_id,sip_call_id,request_id,phone) {
        this.client = new Paho.MQTT.Client(
            "videocall.vnpt.vn",
            Number("8081"),
            "" + Math.random().toString(20).substring(2, 8)
        );
        this.call_id=call_id;
        this.sip_call_id=sip_call_id;
        this.request_id=request_id;
        this.phone=phone;
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
            this.client.subscribe(topic, 
            {
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
        } catch (error) 
        {
            console.error("Subscription error:", error);
            
            return false;
        }
    }

    base64Data(e) 
    {
            return btoa(encodeURIComponent(e).replace(/%([0-9A-F]{2})/g, (function (e, t) {
                return String.fromCharCode(parseInt(t, 16))
            })))
        }


    sendMqtt(e) {
        console.error("MQTT cliet start send Message");
        if (!this.client.isConnected()) 
        {
            console.error("MQTT client is not connected");
            return;
        }
        let i = (new Date).getTime();
        i = Math.floor(i / 1e3);
        const s = {
            ...e,
            time: i
        }
        const a = JSON.stringify(s)
        const n = new Paho.MQTT.Message(this.base64Data(a));
        console.log(n);
        n.destinationName = `UCC/VCall/${this.call_id}`;
        n.qos = 0;
        this.client.send(n)
         console.error("MQTT client end send Message ");
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

            const jsonString = JSON.stringify(messageData);
            
            const encodedData = base64Data(jsonString); 

            if (!encodedData)
            {
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

    async onMessageArrived(message) 
 {
        console.log("onMessageArrived_original: " + message.payloadString);
        var jsonRv = JSON.parse(atob(message.payloadString));
        console.log("onMessageArrived " + JSON.stringify(jsonRv));
        console.log("onMessageArrived " + jsonRv.signal + " - " + jsonRv.dest);

        if(jsonRv.signal=='receiver_answer')
        {
            var entry_point='https://portal-ccbs.mobimart.xyz/api/update-status';

            const hash_id=window.hash_id;
    
            var data_hash=hash_id;
        
            var data=
            {
                'data':data_hash,
                'status_call':"Receiver answer"
            };

            await axios.post(entry_point,data);
        }

        const now = new Date();
        const timestampSec2 = Math.floor(now.getTime() / 1000);
        if(jsonRv.signal=='req_customer_info' && jsonRv.dest=='customer')
        {
          var phone_value='0916688623';
           console.log('send pong back');

            const messageData = {
                "dest": "callcenter",
                "signal": "res_customer_info",
                "type_call": "video",
                "time": timestampSec2,
                "data": {
                    "name": "0919386795",
                    "call_id": this.call_id,
                    "sip_call_id": this.sip_call_id,
                    "data_options": {
                        "msisdn": this.phone,
                        "request_id": this.request_id
                    }
                }
            };
            this.sendMqtt(messageData);
                console.log('start before timeout');   
            setTimeout(() => {
                console.log('process before ping');   
            this.sendMqtt({
                "dest": "callcenter",
                "signal": "ping",
                "type_call": "video",
                "time": Math.floor((new Date()).getTime() / 1000),
                "data": {}
                });
            },3000)
                    
         }
         
         if(jsonRv.signal=='ping' && jsonRv.dest=='customer')
        {
           console.log('send ping back');           
            setTimeout(() => {
                this.sendMqtt({
                "dest": "callcenter",
                "signal": "pong",
                "type_call": "video",
                "time": Math.floor((new Date()).getTime() / 1000),
                "data": {}
                });
            },2000)
         }
         if(jsonRv.signal=='pong' && jsonRv.dest=='customer')
        {
           console.log('send pong back');           
            setTimeout(() => {
                this.sendMqtt({
                "dest": "callcenter",
                "signal": "ping",
                "type_call": "video",
                "time": Math.floor((new Date()).getTime() / 1000),
                "data": {}
                });
            },2000)
         }
   }
}