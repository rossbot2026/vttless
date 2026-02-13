require('dotenv').config();
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
//import * as socket from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
    }
 });

// Health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", service: "eventserver" });
});


const serverPort = process.env.PORT || 4001;

io.on("connection", (socket) => {
  console.log("a user connected:", socket.id);

  socket.on("tokenMove", (data) => {
    // Removed excessive logging for performance - token moves happen frequently during dragging
    socket.to(data.campaignId).emit("tokenMove", data);
  });

  socket.on("tokenUpdate", (data) => {
    // Keep minimal logging for token updates (less frequent than moves)
    console.log("Token update for campaign:", data.campaignId, "token:", data.tokenId);
    socket.to(data.campaignId).emit("tokenUpdate", data);
  });

  socket.on("characterPlaced", (data) => {
    console.log("Character placed in campaign:", data.campaignId, "character:", data.characterId);
    socket.to(data.campaignId).emit("characterPlaced", data);
  });
  socket.on("joinCampaign", (campaignId) => {
    console.log("Joining campaign: " + campaignId + " for user: " + socket.id);
    socket.join(campaignId);
  });

  // WebRTC signaling events - minimal logging to reduce noise
  socket.on("webrtc-offer", (data) => {
    // Forward the offer to the specific user and the campaign room
    socket.to(data.campaignId).emit("webrtc-offer", {
      ...data,
      userName: data.userName || data.fromUserName // Ensure userName is forwarded
    });
  });

  socket.on("webrtc-answer", (data) => {
    socket.to(data.campaignId).emit("webrtc-answer", data);
  });

  socket.on("webrtc-ice-candidate", (data) => {
    // ICE candidates can be very frequent, no logging
    socket.to(data.campaignId).emit("webrtc-ice-candidate", data);
  });

  socket.on("user-joined-video", (data) => {
    console.log("User joined video:", data.userId, "in campaign:", data.campaignId);
    socket.to(data.campaignId).emit("user-joined-video", data);
  });

  socket.on("user-left-video", (data) => {
    console.log("User left video:", data.userId, "in campaign:", data.campaignId);
    socket.to(data.campaignId).emit("user-left-video", data);
  });

  // Test event to verify socket connectivity
  socket.on("test-event", (data) => {
    console.log("TEST EVENT received:", data);
    socket.to(data.campaignId).emit("test-event", data);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected:", socket.id);
  });
});






httpServer.listen(serverPort, ()=>{
    console.log("Server is listening on port " + serverPort);
})