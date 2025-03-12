using MQTTnet;
using MQTTnet.Client;
using System.Text;
using System.Text.Json;
using VideoChat.Hubs;
using Microsoft.AspNetCore.SignalR;
using uPLibrary.Networking.M2Mqtt;
using uPLibrary.Networking.M2Mqtt.Messages;

namespace VideoChat.Services
{
    public class MqttService : IHostedService
    {
        private readonly IMqttClient _mqttClient;
        private readonly ILogger<MqttService> _logger;
        private readonly IHubContext<ChatHub> _hubContext;

        public MqttService(ILogger<MqttService> logger, IHubContext<ChatHub> hubContext)
        {
            _logger = logger;
            _hubContext = hubContext;
            var factory = new MqttFactory();
            _mqttClient = factory.CreateMqttClient();
        }

        public async Task StartAsync(CancellationToken cancellationToken)
        {
            var wsOptions = new MqttClientWebSocketOptions
            {
                Uri = "wss://vcc.vnpt.vn:4443/ws",
                RequestHeaders = new Dictionary<string, string>
                {
                    { "User-Agent", "dart-sip-ua v0.2.2" }
                }
            };

        string brokerAddress = "videocall.vnpt.vn"; // Replace with actual MQTT broker
        
        int brokerPort = 1883;  // Use 8883 for TLS

        
     

            var options = new MqttClientOptionsBuilder()
                .WithWebSocketServer("wss://vcc.vnpt.vn:4443/ws") // VNPT WebSocket URL
                .WithCredentials("username", "password")
            // Replace with actual credentials if needed
                .Build();

            _mqttClient.ConnectedAsync += async (e) =>
            {
                _logger.LogInformation("MQTT Connected");                
                await _mqttClient.SubscribeAsync(new MqttTopicFilterBuilder().WithTopic("UCC/VCall/callcenter").Build());
            };

            _mqttClient.ApplicationMessageReceivedAsync += async (e) =>
            {
                var payload = Encoding.UTF8.GetString(e.ApplicationMessage.PayloadSegment);
                _logger.LogInformation($"MQTT Received: {payload}");
                // Forward to SignalR clients if needed
                await _hubContext.Clients.All.SendAsync("MqttMessageReceived", payload);
            };

            await _mqttClient.ConnectAsync(options, cancellationToken);
        }

        public async Task PublishCallRequest(string hotline)
        {
            var payload = new
            {
                dest = "callcenter",
                signal = "res_customer_info",
                type_call = "video",
                time = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                data = new
                {
                    name = hotline,
                    call_id = $"{Guid.NewGuid()}-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
                    sip_call_id = Guid.NewGuid().ToString(),
                    data_options = new { msisdn = hotline, request_id = Guid.NewGuid().ToString() }
                }
            };

            var message = new MqttApplicationMessageBuilder()
                .WithTopic("UCC/VCall/callcenter")
                .WithPayload(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(payload)))
                .Build();

            await _mqttClient.PublishAsync(message);            
        }

        public Task StopAsync(CancellationToken cancellationToken)
        {
            return _mqttClient.DisconnectAsync();
        }
    }
}