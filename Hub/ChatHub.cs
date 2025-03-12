using Microsoft.AspNetCore.SignalR;
using System.Text;
namespace VideoChat.Hubs;
public class ChatHub:Hub
{
public async Task SendOffer(string targetConnectionId, string sdpOffer)
        {
            await Clients.Client(targetConnectionId).SendAsync("ReceiveOffer", Context.ConnectionId, sdpOffer);
        }

        public async Task SendAnswer(string targetConnectionId, string sdpAnswer)
        {
            await Clients.Client(targetConnectionId).SendAsync("ReceiveAnswer", Context.ConnectionId, sdpAnswer);
        }

        public async Task SendIceCandidate(string targetConnectionId, string candidate)
        {
            await Clients.Client(targetConnectionId).SendAsync("ReceiveIceCandidate", Context.ConnectionId, candidate);
        }

        public async Task InitiateCall(string hotline)
        {
            // Simulate VNPT call initiation logic (could trigger MQTT or API)
            await Clients.Caller.SendAsync("CallInitiated", $"Call to {hotline} started");
        }
}