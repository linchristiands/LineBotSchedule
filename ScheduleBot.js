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
  input=event.message.text.trim().split(/[ ]+/);
  console.log("UserMsg:"+event.message.text);
  // console.log("UserId:"+userId);
  replyLine = { type: 'text', text: event.message.text };
  replyLine.text="";
  if (event.message.text.includes('!add') && (input.length > 3)) // if add and params are well defined add to array
  {
    var name = input[1];
    var place = input[2];
    var date = input[3];
    var gps = input[4];
    var d = date.split("-");
    console.log("Add event");
    console.log("input name:" + name);
    console.log("input place:" + place);
    console.log("input date:" + date);
    console.log("input gps:" + gps);
    var formattedDate = new Date(d[0], d[1], d[2]);
    if (gps == undefined)
      gps = "";

    lineclient.getGroupMemberProfile(groupId, userId).then((profile) => {
      username = profile.displayName;
      insertEntry(name, place, date, gps, username, groupId);
      replyLine.text = "Event added";
      lineclient.replyMessage(event.replyToken, replyLine);
    })
      .catch((err) => {
        console.log("error:"+err);
        console.log("Failed to getmemberprofile");
        lineclient.getProfile(userId).then((profile) => {
          username = profile.displayName;
          insertEntry(name, place, date, gps, username, groupId);
          replyLine.text = "Event added";
          lineclient.replyMessage(event.replyToken, replyLine);
        })
          .catch((err) => {
            console.log("error:"+err);
            console.log("Failed to getprofile");
          });
      });
  }
  else if(event.message.text.includes('!modify'))
  {
    var eventId=input[1];
    var varToModify=input[2];
    var newValue=input[3];
    switch(varToModify)
    {
     case "n":modifyName(eventId,newValue,groupId);break;
     case "p":modifyPlace(eventId,newValue,groupId);break;
     case "d":modifyDate(eventId,newValue,groupId);break;
     case "g":modifyGps(eventId,newValue,groupId);break;
     default:break;
    }
    replyLine.text="Event "+eventId+" has been modified";
    console.log("Modify event");
    sendReply=true;
  }
  else if(event.message.text.includes('!del'))
  {
    var eventId=input[1];
    console.log("Delete event");
    console.log("input id:"+eventId);
    deleteEntry(eventId,groupId);
    replyLine.text="Event "+eventId +" has been deleted";
    sendReply=true;
  }
  else if(event.message.text.includes('!show')&&(input!=undefined))
  {
    loadDB(groupId);
    var eventId=input[1];
    console.log("show event");
    console.log("input id:"+eventId);
    var foundData=search(saveData,eventId);
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
      txtEventList+=a;
      
      if(foundData.attendees[foundData.attendees.length-1]!=a)
        txtEventList+=" - ";
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
    loadDB(groupId);
    console.log("show all event");
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
    var eventId=input[1];
    console.log("attend event");
    console.log("input id:"+eventId);
    lineclient.getGroupMemberProfile(groupId,userId).then((profile) => {
      username=profile.displayName;
      console.log("Attend for username:"+username);
      addAttendeesEntry(username,eventId,groupId);
      lineclient.replyMessage(event.replyToken, replyLine);
    })
    .catch((err) => {
      console.log("error trying to add attendees for eventID:"+eventId);
      console.log("error:"+err);
    });
  }
  else if(event.message.text.includes('!cancel'))
  {
    var eventId=input[1];
    console.log("cancel event");
    console.log("input id:"+eventId);
    lineclient.getGroupMemberProfile(groupId,userId)
    .then((profile) => {
      username=profile.displayName;
      removeAttendeesEntry(username,eventId,groupId);
      lineclient.replyMessage(event.replyToken, replyLine);
    })
    .catch((err) => {
      console.log("error trying to remove attendees for eventID:"+eventId);
      console.log("error:"+err);
    });
  }
  else if(event.message.text.includes('!commands'))
  {
    replyLine.text="Commands to use the bot :"+"\n";
    replyLine.text+="!add {eventName} {place} {date(YYYY-MM-DD)} {gps location (optional)} - Add event"+"\n";
    replyLine.text+="!modify {eventId}{n(ame),p(lace),d(ate),g(ps)}{value}- Modify event"+"\n";
    replyLine.text+="!del {eventId} - Delete event"+"\n";
    replyLine.text+="!all - Show all the events planned"+"\n";
    replyLine.text+="!show {eventId} - Show the specified event "+"\n";
    // replyLine.text+="!showattendees {eventId} - Show the specified event "+"\n";
    replyLine.text+="!attend {eventId} - Add your presence to the specified event"+"\n";
    replyLine.text+="!cancel {eventId} - Remove your participation to the specified event"+"\n";
    sendReply=true;
  }
  else if(event.message.text.includes('!clearAdmin')&& userId == 'Uf9dbaca29d6a4e45f6e9ca9df122cb4c')
  {
   // Clear cache data
  //  save(saveData);
  }
  else if (event.message.text.includes('!database') && userId == 'Uf9dbaca29d6a4e45f6e9ca9df122cb4c') 
  {
    loadAll();
    if (saveData.length <= 0) {
      replyLine.text = "No event planned so far";
      sendReply = true;
      console.log("Empty");
    }
    else {
      var txtEventList = "";
      replyLine.text = "Event List : " + "\n";
      var sortedData = saveData.sort(function (a, b) {
        return new Date(a.date) - new Date(b.date);
      });

      for (var i = 0; i < sortedData.length; i++) {
        var element = sortedData[i];
        console.log("Element : %j", element);
        var formatDate = new Date(element.date);
        var month = formatDate.getUTCMonth() + 1;
        var date = formatDate.getDate();
        // txtEventList+= element.id+" - "+element.name+" - "+element.place+" - "+formatDate.getFullYear()+"-"+month+"-"+formatDate.getDate()+"\n";
        txtEventList += element.id + " - " + element.name + " - " + formatDate.getFullYear() + "-" + month + "-" + formatDate.getDate() + "\n";
      }
      replyLine.text += txtEventList;
      sendReply = true;
    }
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

function loadAll()
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

function loadDB(groupid)
{
  saveData=[];
  const rows= client.querySync('select * from events where groupid=\''+groupid+'\';');
  for (let row of rows) {
    console.log(JSON.stringify(row));
    saveData.push(row);
  }
  for(var item of saveData){
    console.log(JSON.stringify(item));
  }
}

function insertEntry(name,place,date,gps,createdby,groupid)
{
  client.querySync('INSERT INTO events (id,name,place,date,gps,attendees,createdby,groupid) VALUES ((SELECT COUNT(events.id) from events where groupid=\''+groupid+'\'),\''+name+'\',\''+place+'\',\''+date+'\',\''+gps+'\',array[]::text[],\''+createdby+'\',\''+groupid+'\');');
}

function modifyEntry(eventId,name,place,date,gps,groupid)
{
  client.querySync('update events set name=\''+name+'\',place=\''+place+'\',date=\''+date+'\',gps=\''+gps+'\'where id='+eventId+' and groupid=\''+groupid+'\';');
}

function modifyName(eventId,name,groupid)
{
  client.querySync('update events set name=\''+name+'\' where id='+eventId+' and groupid=\''+groupid+'\';');
}
function modifyDate(eventId,date,groupid)
{
  client.querySync('update events set date=\''+date+'\'where id='+eventId+' and groupid=\''+groupid+'\';');
}
function modifyPlace(eventId,place,groupid)
{
  client.querySync('update events set place=\''+place+'\'where id='+eventId+' and groupid=\''+groupid+'\';');
}
function modifyGps(eventId,gps,groupid)
{
  client.querySync('update events set gps=\''+gps+'\' where id='+eventId+' and groupid=\''+groupid+'\';');
}

function getInfoEntry(eventId,groupid)
{
  return client.querySync('select * from events where id='+eventId+' and groupid=\''+groupid+'\';');
}

function getAttendeesEntry(eventId,groupid)
{
  var row=client.querySync('select attendees from events where id='+eventId+' and groupid=\''+groupid+'\';');
  return row;
}

function addAttendeesEntry(name,eventId,groupid)
{
  var res=getAttendeesEntry(eventId);
  var i =res[0];
  if(i!=undefined && i.attendees.indexOf(name)>-1 ){
    // in array
    replyLine.text="You are already participating in the event "+eventId;
  }
  else{
    // not on the in list
    client.querySync('update events set attendees = array_cat(attendees,\'{'+name+'}\') where id='+eventId+' and groupid=\''+groupid+'\';');
    replyLine.text="Confirming participation for "+name+" at event "+eventId;
  } 
}

function removeAttendeesEntry(name,eventId,groupid){
  client.querySync('update events set attendees = array_remove(attendees, \''+name+'\') where id='+eventId+' and groupid=\''+groupid+'\';');
  replyLine.text="Confirming cancellation for "+name+" at event "+eventId;
}


function deleteEntry(eventId,groupid){
  client.querySync('delete from events where id='+eventId+' and groupid=\''+groupid+'\';');
}

function resetDB(){
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