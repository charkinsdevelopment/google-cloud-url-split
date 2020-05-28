const request = require('request');

const forwardUrl = 'https://analytics.250ok.com/webhooks/878D784B08FF412B979C1BE42E43188E';

/**
 * Background function triggered by Pub/Sub and forwards the message to a URL.
 *
 * @param {object} event The Cloud Functions event.
 * @param {function} callback The callback function.
 */
exports.subscriber = (event, callback) => {

    // https://cloud.google.com/pubsub/docs/reference/rest/v1/PubsubMessage
    const message = event.data;
  	
  	// attempt to send 250 ok formatted object data.
  	var decoded = Buffer.from(message.data, 'base64').toString(); 
  	var temp = JSON.parse(decoded);
    //console.log(temp[0]);
  	//console.log('sg event - ' + temp[0].event + ' ' + temp[0].PSMCategory);
  	//console.log(temp);
	var eventName = temp[0].event;
  //multi-use properties
    var attempts = '';
    var smtpLog = '';
  	
  	//read and click properties
    var userAgent = '';
    var deviceIp = '';
    var url = '';
    
  	//bounce properties
 	var bounceCode = '';
    
    //filtered
  	var reason = '';
  
  	//unsubscribe
  	var method = '';
  
  	//complained
  	var fblDomain = '';
  
  switch(eventName) {
  case 'bounce':
    eventName = 'bounced';
    bounceCode = '';
    smtpLog = temp[0]['smtp-id'];
    break;
  case 'dropped':
    eventName = 'filtered';
    reason = temp[0].reason;
    break;
  case 'open':
    eventName = 'read';
    userAgent = temp[0].useragent;
    deviceIp = temp[0].ip;
    break;
  case 'processed':
    eventName = 'created';
    break;
  case 'spamreport':
    eventName = 'complained';
    fblDomain = '';
    break;
  case 'unsubscribe':
    eventName = 'unsubscribed';
    method = '';
    break;
  case 'click':
      eventName = 'click';
      userAgent = temp[0].useragent;
      deviceIp = temp[0].ip;
      url = temp[0].url;
  case 'deferred':
      attempts = temp[0].attempt;
      smtpLog = temp[0]['smtp-id'];
  default:
    eventName = temp[0].event;
}
  	

  	var oData = new Object();
  	oData.event = eventName;
  	oData.eventTime = temp[0].timestamp;
  	oData.from = '';
  	oData.ip = temp[0].ip;
  	oData.messageId = temp[0].sg_message_id;
  	oData.properties = '';
  	oData.sendTime = temp[0].timestamp;
  	oData.smtpFrom = '';
  	oData.smtpTo = temp[0].email;
  	oData.subject = '';
  	oData.tags = '';
  	oData.to = temp[0].email;
    if(userAgent != '') oData.userAgent = userAgent;
  	if(attempts != '') oData.attempts = attempts;
    if(smtpLog != '') oData.smtpLog = smtpLog;
   	if(deviceIp != '') oData.deviceIp = deviceIp;
   	if(url != '') oData.url = url;
   	if(bounceCode != '') oData.bounceCode = bounceCode;
  	if(reason != '') oData.reason = reason;
   	if(method != '') oData.method = method;
   	if(fblDomain != '') oData.fblDomain = fblDomain;
  	var result = [];
    result.push(oData);
    //var jsonObject = JSON.stringify(oData);
  	//console.log('converted to 250ok');
  	//console.log(jsonObject);
  
    var encoded = Buffer.from(JSON.stringify(result));
  	message.data = encoded;
	
    // ignore messages older than 1 hour to avoid large queue and infinite retries
    const age = Date.now() - Date.parse(message.publishTime);
    if (age > 60*60*1000) {
        callback();
        return;
    }

    // pub/sub message data is base64 encoded
    const body = Buffer.from(message.data, 'base64');

    const options = {
        url: forwardUrl,
        headers: {
            'Content-Type': 'application/json; charset=utf-8'
            //'Authorization': 'Basic ' + Buffer.from('username:password').toString('base64')
        },
        body: body,
    };

    req = request.post(options, (err, res, body) => {
        if (err) {
            console.error(err);
            callback(err);
            return;
        }
        if (res.statusCode != 200) {
            console.error(body);
            callback(new Error(res.StatusMessage));
            return;
        }
        callback();
    });
};
