const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const OpenAI = require('openai');


dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3000;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const chatSchema = new mongoose.Schema({
  user: String,
  message: String,
});

const Chat = mongoose.model('Chat', chatSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});


io.on('connection', (socket) => {
  console.log('User connected');


  socket.on('chat message', async (message) => {
    console.log('User Message:', message);


    const chatEntry = new Chat({ user: 'user', message });
    await chatEntry.save();


    try {
      const chatCompletion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ "role": "user", "content": message }],
      });

      console.log(chatCompletion.choices[0].message);

      const chatbotResponse = chatCompletion.choices[0].message.content;

      const chatbotEntry = new Chat({ user: 'chatbot', message: chatbotResponse });
      await chatbotEntry.save();

      io.emit('chat message', { user: 'user', message });
      io.emit('chat message', { user: 'chatbot', message: chatbotResponse });
    } catch (error) {
      console.error('Error communicating with OpenAI API:', error.message);
    }
  });

  // Disconnect event
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
