const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3000;

mongoose.connect('mongodb+srv://Asutosh123:BtgunIHqnLkC17mG@cluster0.foig4je.mongodb.net/?retryWrites=true&w=majority', {
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
      const openAIResponse = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'system', content: 'You are a chatbot.' }, { role: 'user', content: message }],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer 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`, // Replace with your actual OpenAI API key
          },
        }
      );

      const chatbotResponse = openAIResponse.data.choices[0].message.content;

      // Save the chatbot response to MongoDB
      const chatbotEntry = new Chat({ user: 'chatbot', message: chatbotResponse });
      await chatbotEntry.save();

      // Broadcast the chatbot's response to all clients
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
