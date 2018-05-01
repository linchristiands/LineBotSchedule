'use strict';
const https = require('https');
const line = require('@line/bot-sdk');
const express = require('express');
// const fs = require('fs');

// const { Client } = require('pg');
// const client = new Client({
//   connectionString: process.env.DATABASE_URL,
//   ssl: true,
// });
// client.connect();

var Client = require('pg-native');
console.log(process.env.DATABASE_URL);
var client = new Client({
  ssl: true
});
client.connectSync(process.env.DATABASE_URL);

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
var replyLine;
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
  var input=[];
  
  input=event.message.text.split(/[ ]+/);
  replyLine = { type: 'text', text: event.message.text };
  replyLine.text="";
  if(event.message.text.includes('!add')&&(input.length>3)) // if add and params are well defined add to array
  {
    var name=input[2];
    var place=input[3];
    var date=input[4];
    var gps=input[5];
    var d=date.split("-");
    var formattedDate = new Date(d[0],d[1],d[2]);
    if(gps==undefined)
      gps="";
    insertEntry(name,place,date,gps);
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
    var id=input[2];
    deleteEntry(id);
    replyLine.text="Event "+id +" has been deleted";
    sendReply=true;
  }
  else if(event.message.text.includes('!show')&&(input!=undefined))
  {
    loadDB();
    var id=input[2];
    var foundData=search(saveData,id);
    var txtEventList="";
    if(foundData!=undefined){
    var formatDate=new Date(foundData.date);
    var month=formatDate.getUTCMonth()+1;
    var date=formatDate.getDate();
    if (foundData.gps!="")
      txtEventList+= foundData.id+" - "+foundData.name+" - "+foundData.place+" - "+formatDate.getFullYear()+"-"+month+"-"+date+" - GPS location: "+foundData.gps +"\n";
    else
      txtEventList+= foundData.id+" - "+foundData.name+" - "+foundData.place+" - "+formatDate.getFullYear()+"-"+month+"-"+date+"\n";
      
    if (foundData.attendees.length!=0)
    {
      txtEventList+= "Attendees : ";
      for(var a of foundData.attendees){
      txtEventList+=a +"\n";
      }
    }
    replyLine.text=txtEventList;
    }
    else
    {
      replyLine.text="Id not found, try again";
    }
    sendReply=true;
  }
  else if(event.message.text.includes('!all'))
  {
    loadDB();
    if(saveData.length<=0){
      replyLine.text="No event planned so far";
      sendReply=true;
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
        var month=formatDate.getUTCMonth()+1;
        var date=formatDate.getDate();
        // txtEventList+= element.id+" - "+element.name+" - "+element.place+" - "+formatDate.getFullYear()+"-"+month+"-"+formatDate.getDate()+"\n";
        txtEventList+= element.id+" - "+element.name+" - "+formatDate.getFullYear()+"-"+month+"-"+formatDate.getDate()+"\n";
      }
      replyLine.text+=txtEventList;
      sendReply=true;
    }
  }
  else if(event.message.text.includes('!attend'))
  {
   
    // get userName and add to attendees list
    var eventId=input[2];
    // getUserInfos()
    lineclient.getProfile(userId)
    .then((profile) => {
      username=profile.displayName;
      addAttendeesEntry(username,eventId);
      lineclient.replyMessage(event.replyToken, replyLine);
    })
    .catch((err) => {
      // error handling
    });
  }
  else if(event.message.text.includes('!cancel'))
  {
    var eventId=input[2];
    lineclient.getProfile(userId)
    .then((profile) => {
      username=profile.displayName;
      removeAttendeesEntry(username,eventId);
      lineclient.replyMessage(event.replyToken, replyLine);
    })
    .catch((err) => {
      console.log(err);
    });
  }
  else if(event.message.text.includes('!commands'))
  {
    replyLine.text="Commands to use the bot :"+"\n";
    replyLine.text+="!add {eventName} {place} {date(YYYY-MM-DD)} {gps location (optional)} - Add event"+"\n";
    replyLine.text+="!modify {eventId} {eventName} {place} {date(YYYY-MM-DD)} - Modify event"+"\n";
    replyLine.text+="!del {eventId} - Delete event"+"\n";
    replyLine.text+="!all - Show all the events planned"+"\n";
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
  saveData=[];
  const rows= client.querySync('select * from events;');
  for (let row of rows) {
    console.log(JSON.stringify(row));
    saveData.push(row);
  }
  for(var item of saveData){
    console.log(JSON.stringify(item));
  }
}

function insertEntry(name,place,date,gps)
{
  client.querySync('INSERT INTO events (name,place,date,gps,attendees) VALUES (\''+name+'\',\''+place+'\',\''+date+'\',\''+gps+'\',array[]::text[]);');
}

function modifyEntry(eventId,name,place,date)
{
  client.querySync('update events set name=\''+name+'\',place=\''+place+'\',date=\''+date+'\'+ where id=+'+eventId+';');
}

function getInfoEntry(eventId){
  return client.querySync('select * from events where id='+eventId+';');
}

function getAttendeesEntry(eventId){
  var row=client.querySync('select attendees from events where id='+eventId+';');
  return row;
}

function addAttendeesEntry(name,eventId){
  var res=getAttendeesEntry(eventId);
  var i =res[0];
  if(i.attendees.indexOf(name)>-1){
    // in array
    replyLine.text="You are already participating in the event "+eventId;
  }
  else{
    // not on the in list
    client.querySync('update events set attendees = array_cat(attendees,\'{'+name+'}\') where id='+eventId+';');
    replyLine.text="Confirming participation for "+name+" at event "+eventId;
  } 
}

function removeAttendeesEntry(name,eventId){
  client.querySync('update events set attendees = array_remove(attendees, \''+name+'\') where id='+eventId+';');
  replyLine.text="Confirming cancellation for "+name+" at event "+eventId;
}


function deleteEntry(eventId){
  client.querySync('delete from events where id='+eventId+";");
}

function resetDB()
{
  client.querySync('DELETE FROM events;');
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