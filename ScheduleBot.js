'use strict';

const line = require('@line/bot-sdk');
const express = require('express');

// create LINE SDK config from env variables
const config = {
  channelAccessToken: 'yeTB4ca7GdRlYzTk1YxPF+2VNI8J8o9K17A+0c0ApZ+U0eMIyZVCXhPBnJv5bzAdiG4e6V4Mwppe3s6OihdcSN1ctdycBqHBbEXS6ComIVxsNqUT8oIusKmKewWn/xe+UF8VWwSvtlcE07b4Tjw6AwdB04t89/1O/w1cDnyilFU=',
  channelSecret: '7c1bfc82ec2630ba0af69404af64ec16',
};

// create LINE SDK client
const client = new line.Client(config);

// create Express app
// about Express itself: https://expressjs.com/
const app = express();

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post('/callback', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => 
    res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// event handler
function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    // ignore non-text-message event
    return Promise.resolve(null);
  }

  // create a echoing text message
  const echo = { type: 'text', text: event.message.text };
  if(event.message.text.includes('!add'))
  {
    echo.text="Detect user request to add event";
  }
  else if(event.message.text.includes('!del'))
  {
    echo.text="Detect user request to delete event";
  }
  else if(event.message.text.includes('!show'))
  {
    echo.text="Detect user request to show planned events";
  }
  else if(event.message.text.includes('!commands'))
  {
    echo.text="Commands to use the bot :"+"\n";
    echo.text+="!add {eventName} {place} {date} - Add event in the bot's memory"+"\n";
    echo.text+="!del {eventId} - Delete event in the bot's memory"+"\n";
    echo.text+="!showall - Show all the events planned"+"\n";
    echo.text+="!show {eventId} - Show the event specified"+"\n";
  }
  // use reply API
  return client.replyMessage(event.replyToken, echo);
}

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});