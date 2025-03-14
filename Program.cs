using VideoChat.Hubs;
using Microsoft.AspNetCore.SignalR;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSignalR();


builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
    {
        builder.AllowAnyOrigin()
               .AllowAnyMethod()
               .AllowAnyHeader();
    });
});

builder.Services.AddControllers();

// builder.Services.AddHostedService<MqttService>();
var app = builder.Build();

app.UseCors("AllowAll");

app.UseRouting();

app.UseStaticFiles();

app.MapHub<ChatHub>("/chatHub");

app.MapGet("/", async context => 
{
    
    context.Response.Redirect("/index.html");

    await Task.CompletedTask;
});

app.Run();
