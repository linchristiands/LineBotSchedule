'use strict';

const line = require('@line/bot-sdk');
const express = require('express');
const fs = require('fs');

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

let eventList=JSON.parse(fs.readFileSync("./data.json","utf8"));
// var eventModelData=
// {
//   id:"",
//   name:"",
//   attendees:[],
//   place:"",
//   date:"",
//   gpslocation:,
// };

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
  var v=false;
  var input=[];
  var saveData = [];
  input=event.message.text.split(/[ ]+/);
  if(event.message.text.includes('!add')&&(input.length==4)) // if add and params are well defined add to array
  {
    echo.text="Detect user request to add event";
    var name=input[1];
    var place=input[2];
    var date=input[3];
    var LineEvent={
      name:name,
      place:place,
      date:date,
      attendees:[],
    };
    saveData.push(LineEvent);
    console.log("SaveData:"+(JSON.stringify(saveData, false, null)));
    save(saveData);
  }
  else if(event.message.text.includes('!modify'))
  {
    echo.text="Detect user request to modify event specified";
    // var idToModify=input[1];
    // var name=input[2];
    // var place=input[3];
    // var date=input[4];
    // var LineEvent={
    //   name:name,
    //   place:place,
    //   date:date,
    //   attendees:[],
    // };
  }
  else if(event.message.text.includes('!del'))
  {
    echo.text="Detect user request to delete event";
  }
  else if(event.message.text.includes('!show'))
  {
    echo.text="Detect user request to show event specified";
  }
  else if(event.message.text.includes('!all'))
  {
    if(eventList.length<=0){
      echo.text="No event planned so far";
      console.log("Empty");
    }
    else
    {
      console.log("Not Empty");
      var txtEventList="";
      echo.text="Event List : "+"\n";
      for(var i=0;i<eventList.length;i++)
      {
        var element=eventList[i];
        txtEventList+= element.id+" - "+element.name+" "+element.date +" "+element.place+"\n";
      }
      echo.text+=txtEventList;
    }
  }
  else if(event.message.text.includes('!attend'))
  {
    echo.text="Detect user request to attend to event specified";
  }
  else if(event.message.text.includes('!commands'))
  {
    echo.text="Commands to use the bot :"+"\n";
    echo.text+="!add {eventName} {place} {date} - Add event"+"\n";
    echo.text+="!modify {eventId} {eventName} {place} {date} - Modify event"+"\n";
    echo.text+="!del {eventId} - Delete event"+"\n";
    echo.text+="!showall - Show all the events planned"+"\n";
    echo.text+="!show {eventId} - Show the specified event "+"\n";
    echo.text+="!showattendees {eventId} - Show the specified event "+"\n";
    echo.text+="!attend {eventId} - Add your presence to the specified event"+"\n";
  }
  else if(event.message.text.includes('!clearAdmin'))
  {
   // Clear cache data
   saveData=[];
   save(saveData);
  }

  

  // use reply API
  return client.replyMessage(event.replyToken, echo);
}

function save(data)
{
  // save data
  var saveFile = JSON.stringify(data);
  fs.writeFile('data.json', saveFile,'utf8', function (err) {
    if (err) throw err;
    console.log('Saved!');
  }); 
}
// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});