'use strict'
const line = require('node-line-bot-api')
const express = require('express')
const bodyParser = require('body-parser')
const app = express()

// need raw buffer for signature validation
app.use(bodyParser.json({
  verify (req, res, buf) {
    req.rawBody = buf
  }
}))

// init with auth
line.init({
  accessToken: 'yeTB4ca7GdRlYzTk1YxPF+2VNI8J8o9K17A+0c0ApZ+U0eMIyZVCXhPBnJv5bzAdiG4e6V4Mwppe3s6OihdcSN1ctdycBqHBbEXS6ComIVxsNqUT8oIusKmKewWn/xe+UF8VWwSvtlcE07b4Tjw6AwdB04t89/1O/w1cDnyilFU=',
  // (Optional) for webhook signature validation
  channelSecret: '7c1bfc82ec2630ba0af69404af64ec16'
})
app.get('/',function(req,res){
  res.sendStatus(200);
})
app.post('/webhook/', line.validator.validateSignature(), (req, res, next) => {
  // get content from request body
  const promises = req.body.events.map(event => {
    // reply message
    return line.client
      .replyMessage({
        replyToken: event.replyToken,
        messages: [
          {
            type: 'text',
            text: event.message.text
          }
        ]
      })
  })
  Promise
    .all(promises)
    .then(() => res.json({success: true}))
})

app.listen(process.env.PORT || 3000, () => {
  console.log('Example app listening on port 3000!')
})