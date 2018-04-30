'use strict';
const https = require('https');
const line = require('@line/bot-sdk');
const express = require('express');
// const fs = require('fs');

const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});

let saveData = [];

// create LINE SDK config from env variables
const config = {
  channelAccessToken: 'yeTB4ca7GdRlYzTk1YxPF+2VNI8J8o9K17A+0c0ApZ+U0eMIyZVCXhPBnJv5bzAdiG4e6V4Mwppe3s6OihdcSN1ctdycBqHBbEXS6ComIVxsNqUT8oIusKmKewWn/xe+UF8VWwSvtlcE07b4Tjw6AwdB04t89/1O/w1cDnyilFU=',
  channelSecret: '7c1bfc82ec2630ba0af69404af64ec16',
};

// create LINE SDK client
const lineclient = new line.Client(config);

// create Express app
// about Express itself: https://expressjs.com/
const app = express();

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
  var sendReply=false;
  if (event.type !== 'message' || event.message.type !== 'text') {
    // ignore non-text-message event
    return Promise.resolve(null);
  }
  var groupId;
  var userId;
  var username;
  userId=event.source.userId;
  if(event.source.type=="group")
  {
    groupId=event.source.groupId;
    console.log("Message from userid :"+userId+ " in group :"+groupId);
  }
  console.log("Message from USERID:"+userId);

  // getUserInfos()
  lineclient.getProfile(userId)
  .then((profile) => {
    username=profile.displayName;
    console.log("Message from username:"+username);
    // console.log(profile.userId);
    // console.log(profile.pictureUrl);
    // console.log(profile.statusMessage);
  })
  .catch((err) => {
    // error handling
  });
 
  client.connect();
  // create a echoing text message
  const replyLine = { type: 'text', text: event.message.text };
  var input=[];
  
  // console.log("loadDB");
  loadDB();
  input=event.message.text.split(/[ ]+/);

  if(event.message.text.includes('!add')&&(input.length==4)) // if add and params are well defined add to array
  {
    var name=input[1];
    var place=input[2];
    var date=input[3];
    var d=date.split("-");
    var formattedDate = new Date(d[0],d[1],d[2]);
    var LineEvent={
      id:saveData.length+1,
      name:name,
      place:place,
      date:formattedDate,
      attendees:[],
    };
    saveData.push(LineEvent);
    console.log("SaveData:"+(JSON.stringify(saveData, false, null)));
    save(saveData);
    replyLine.text="Event added";
    sendReply=true;
  }
  else if(event.message.text.includes('!modify'))
  {
    replyLine.text="Detect user request to modify event specified";
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
    sendReply=true;
  }
  else if(event.message.text.includes('!del'))
  {
    replyLine.text="Detect user request to delete event";
    sendReply=true;
  }
  else if(event.message.text.includes('!show')&&(input!=undefined)&&(input.length==2))
  {
    var id=input[1];
    var foundData=search(saveData,id);
    var txtEventList="";
    var formatDate=new Date(foundData.date);
    txtEventList+= foundData.id+" - "+foundData.name+" "+formatDate.getFullYear()+"-"+formatDate.getUTCMonth()+"-"+formatDate.getDate() +" "+foundData.place+"\n";
    //TODO ADD GPS LOCATION
    replyLine.text+=txtEventList;
    sendReply=true;
  }
  else if(event.message.text.includes('!all'))
  {
    if(saveData.length<=0){
      replyLine.text="No event planned so far";
      console.log("Empty");
    }
    else
    {
      console.log("Not Empty : "+saveData.length);
      var txtEventList="";
      replyLine.text="Event List : "+"\n";
      var sortedData=saveData.sort(function(a,b){
        return new Date(a.date) - new Date(b.date);
      });
      
      for(var i=0;i<sortedData.length;i++)
      {
        var element=sortedData[i];
        console.log("Element : %j",element);
        var formatDate=new Date(element.date);
        txtEventList+= element.id+" - "+element.name+" "+formatDate.getFullYear()+"-"+formatDate.getUTCMonth()+"-"+formatDate.getDate()+" "+element.place+"\n";
      }
      replyLine.text+=txtEventList;
      sendReply=true;
    }
  }
  else if(event.message.text.includes('!attend'))
  {
    replyLine.text="Detect user request to attend event specified";
    // get userName and add to attendees list
    var eventId=input[1];
    addAttendeesEntry(username,eventId);
    sendReply=true;
  }
  else if(event.message.text.includes('!cancel'))
  {
    replyLine.text="Detect user request to cancel event specified";
    // get userName and add to attendees list
    var eventId=input[1];
    removeAttendeesEntry(username,eventId);
    sendReply=true;
  }
  else if(event.message.text.includes('!commands'))
  {
    replyLine.text="Commands to use the bot :"+"\n";
    replyLine.text+="!add {eventName} {place} {date(YY-MM-DD)} - Add event"+"\n";
    replyLine.text+="!modify {eventId} {eventName} {place} {date(YY-MM-DD)} - Modify event"+"\n";
    replyLine.text+="!del {eventId} - Delete event"+"\n";
    replyLine.text+="!showall - Show all the events planned"+"\n";
    replyLine.text+="!show {eventId} - Show the specified event "+"\n";
    replyLine.text+="!showattendees {eventId} - Show the specified event "+"\n";
    replyLine.text+="!attend {eventId} - Add your presence to the specified event"+"\n";
    replyLine.text+="!cancel {eventId} - Remove your participation to the specified event"+"\n";
    sendReply=true;
  }
  else if(event.message.text.includes('!clearAdmin'))
  {
   // Clear cache data
  //  save(saveData);
  }

  // use reply API
  //client.end();
  if(sendReply)
  {
    lineclient.replyMessage(event.replyToken, replyLine);
  }
  client.end();
  return;
}
// function load(){
//   var initArray=[];
//   var obj = JSON.parse(fs.readFileSync('data.json', 'utf8'));
//   for(var i=0;i<obj.length;i++){
//     initArray.push(obj[i]);
//   }
//   return initArray;
// }

function loadDB()
{
  client.query('select id from events;', (err, res) => {
    console.log("res:%j",res);
    if (err) {
      console.log(err);
      throw err;
    }
    else
    {
      console.log("no err");
    }
    for (let row of res.rows) {
      console.log(JSON.stringify(row));
      saveData.push(JSON.stringify(row));
    }
  });
}

function insertEntry(name,place,date)
{
  client.query('INSERT INTO events (name,place,date,attendees) VALUES (\''+name+'\',\''+place+'\',\''+date+'\',array[]::text[]);', (err, res) => {
    if (err) throw err;
  });
}

function modifyEntry(eventId,name,place,date)
{
  client.query('update events set name=\''+name+'\',place=\''+place+'\',date=\''+date+'\'+ where id=+'+eventId+';', (err, res) => {
    if (err) throw err;
  });
}

function getInfoEntry(eventId){
  client.query('select * from events where id='+eventId+';', (err, res) => {
    if (err) throw err;
  });
}

function getAttendeesEntry(eventId){
  client.query('select attendees from events where id='+eventId+';', (err, res) => {
    if (err) throw err;
  });
}

function addAttendeesEntry(name,eventId){
  var attendees=getAttendeesEntry(eventId);
  if(attendees.indexOf(name)>-1){
    // in array
  }
  else{
    // not already in list
    client.query('update events set attendees = array_cat(attendees,\'{'+name+'}\');', (err, res) => {
      if (err) throw err;
    });
  } 
}

function removeAttendeesEntry(name){
  client.query('update events set attendees = array_remove(attendees, \''+name+'\');', (err, res) => {
    if (err) throw err;
  });
}


function deleteEntry(eventId){
  client.query('delete from events where id='+eventId+";", (err, res) => {
    if (err) throw err;
    client.end();
  });
}

function resetDB()
{
  client.query('DELETE FROM events;', (err, res) => {
    if (err) throw err;
  });
}

function search(data,id)
{
  return data.find(element=> element.id==id);
}

// function save(data)
// {
//   // save data
//   var saveFile = JSON.stringify(data);
//   fs.writeFile('data.json', saveFile,'utf8', function (err) {
//     if (err) throw err;
//     console.log('Saved!');
//   }); 
// }
// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});