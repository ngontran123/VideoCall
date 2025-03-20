class MQTTClient {

    call_id;
    sip_call_id;
    request_id;
    phone;
    data_hash;
    constructor(call_id, sip_call_id, request_id, phone, data_hash) {
        this.client = new Paho.MQTT.Client(
            "videocall.vnpt.vn",
            Number("8081"),
            "" + Math.random().toString(20).substring(2, 8)
        );
        this.call_id = call_id;
        this.sip_call_id = sip_call_id;
        this.request_id = request_id;
        this.data_hash = data_hash;
        this.phone = phone;
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

    enData(e) {
        return btoa(encodeURIComponent(e).replace(/%([0-9A-F]{2})/g, (function (e, t) {
            return String.fromCharCode(parseInt(t, 16))
        })))
    }


    pushMsg(e) {
        console.error("MQTT cliet start send Message");
        if (!this.client.isConnected()) {
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
        const n = new Paho.MQTT.Message(this.enData(a));
        console.log(n);
        n.destinationName = `UCC/VCall/${this.call_id}`;
        n.qos = 0;
        this.client.send(n)
        console.error("MQTT client end send Message ");
    }

    onConnectionLost(responseObject) {
        if (responseObject.errorCode !== 0) {
            console.error("MQTT Connection Lost:", responseObject.errorMessage);
        }
    }

    async onMessageArrived(message) {
        console.log("onMessageArrived_original: " + message.payloadString);
        var jsonRv = JSON.parse(atob(message.payloadString));
        console.log("onMessageArrived " + JSON.stringify(jsonRv));

        if (jsonRv.signal != 'ping' && jsonRv.signal != 'pong') {
            var submit = this.data_hash;
            var data =
            {
                'data': submit,
                'status_call': jsonRv.signal,
            };
            await axios.post("https://portal-ccbs.mobimart.xyz/api/update-status", data);
        }
        const now = new Date();
        const timestampSec2 = Math.floor(now.getTime() / 1000);
        if (jsonRv.signal == 'req_customer_info' && jsonRv.dest == 'customer') {
            const messageData = {
                "dest": "callcenter",
                "signal": "res_customer_info",
                "type_call": "video",
                "time": timestampSec2,
                "data": {
                    "name": this.phone,
                    "call_id": this.call_id,
                    "sip_call_id": this.sip_call_id,
                    "data_options": {
                        "msisdn": this.phone,
                        "request_id": this.request_id
                    }
                }
            };
            this.pushMsg(messageData);
            console.log('start before timeout');
            setTimeout(() => {
                console.log('process before ping');
                this.pushMsg({
                    "dest": "callcenter",
                    "signal": "ping",
                    "type_call": "video",
                    "time": Math.floor((new Date()).getTime() / 1000),
                    "data": {}
                });
            }, 4000)

        }

        if (jsonRv.signal == 'ping' && jsonRv.dest == 'customer') {
            setTimeout(() => {
                this.pushMsg({
                    "dest": "callcenter",
                    "signal": "pong",
                    "type_call": "video",
                    "time": Math.floor((new Date()).getTime() / 1000),
                    "data": {}
                });
            }, 4000)
        }
        if (jsonRv.signal == 'pong' && jsonRv.dest == 'customer') {
            setTimeout(() => {
                this.pushMsg({
                    "dest": "callcenter",
                    "signal": "ping",
                    "type_call": "video",
                    "time": Math.floor((new Date()).getTime() / 1000),
                    "data": {}
                });
            }, 4000)
        }
    }
}
