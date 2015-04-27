


//var express = require("express");
//var app = express();
//var requirejs = require('requirejs');
//var http = require('http')
var server = require('http').createServer();
var paypal = require('./paypal');
var serverlist = require('./serverlist');
var gamecommands = require('./gamecommands');
var mailer = require('nodemailer');
var accountSid = 'ACf7b7e916426d97cb264ee7f51b0ec59d';
var authToken = "756a366f2eafbd45c8a2c10241bacaae";
var client = require('twilio')(accountSid, authToken);

var myport = process.env.OPENSHIFT_NODEJS_PORT;
var myip = process.env.OPENSHIFT_NODEJS_IP;

if(myport === undefined || myport === null){
  myport = 7777;}
  
if(myip === undefined || myip === null){
  myip = "127.0.0.1";}

server.listen(myport, myip);
var io = require('socket.io').listen(server);
console.log("listening on " + myip + ":" + myport);
//requirejs.config({
    //nodeRequire: require,
    //baseUrl: __dirname + '/static/js',
    //paths: {
        //"paypal": "paypal",
        //"serverlist": "serverlist"
    //}
//});

//requirejs(['paypal', 'serverlist','nodemailer'], function(paypal, serverlist, mailer){
  //var defaultConfig = function() {
    //app.use('/static', express.static(__dirname + '/static'));
    //app.use(express.static(__dirname + '/static'));
    //app.set('views', __dirname + '/views');
    //app.set('view options', { layout: false });
    //specify ejs as our template engine.
    //app.set('view engine', 'ejs');
  //};
    
  //app.configure(defaultConfig);
  /*
  pageMap = ['home'].map(function(tab) {
          var templateFilename = __dirname + '/views/' + tab + '.ejs';
          return { name: tab,
                   compiledTemplate: ejs.compile(fs.readFileSync(templateFilename, 'utf8'), { filename : templateFilename })
          };
      }).reduce(function(memo, curr) {
          memo[curr.name] = curr;
          return memo;
      }, { });

  var renderPage = function(res, pageName) {
    res.render('index', { locals: {
            page: pageMap[pageName]
        }});
  };

  app.get("/", function(req, res) {
      renderPage(res, "home");    
  });
  */

  var smtpTransport = mailer.createTransport("SMTP", {
    service: "Gmail",
    auth: {
      user: "contact@nlogicstudios.com",
      pass: ""//removed with shutdown
      }
    });

function getDateTime() {

    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + ":" + month + ":" + day + ":" + hour + ":" + min + ":" + sec;

}

smtpTransport.sendMail({
   from: "NLogic Paypal Interface Webserver <contact@nlogicstudios.com>", // sender address
   to: "NLogic Customer Service <contact@nlogicstudios.com>", // comma separated list of receivers
   subject: "database reset, paypal needs authorization", // Subject line
   text: "Paypal authorization needs to be reenabled as server has just started up. EnableStoreForAllUsers command from dev account in game." + getDateTime()  // plaintext body
}, function(error, response){
   if(error){
     console.log(error);
   }else{
     console.log("Message sent: " + response.message);
   }
});

/*
client.sms.messages.create({
    body: "Paypal authorization needs to be reenabled" + getDateTime(),
    to: "+19087635754",
    from: "+19788743073"
}, function(err, message) {
    console.log("Error:" + JSON.stringify(err) + "||" + message);
});*/
  //511 is default backlog size
  //app.listen(myport, myip, 511, function(err){
    //console.log(this);

    io.configure(function () { 
      io.set('transports', ['websocket']);
      io.set('polling duration', 60);
      io.set('browser client', false);
      io.set('match origin protocol', true);
      io.set('authorization', function(handshakedata, callback){
        //console.log("socket.io-authorization");
        callback(null, true, handshakedata);
      });
    });
    
    io.sockets.on('connection', function (socket) {
      socket.on('AddListingToServer', function(data) {
          serverlist.AddListingToServer(data);
          socket.emit('returnserverlisting', data);
      });
      
      socket.on('RemoveListingFromServer', function(data) {
          serverlist.RemoveListingFromServer(data);
      });
      
      socket.on('ResendListings', function(data) {
          serverlist.EmitMetaData(socket);
          serverlist.ResendListings(socket);
      });
      
      socket.on('Heartbeat', function(data) {
          serverlist.Heartbeat(data);
      });
      
      socket.on('PendingListing', function(data) {
          if(serverlist.AddPendingListing(data) == true)
            socket.emit('PendingListingApproved', null);
          else
            socket.emit('PendingListingNotApproved', null);
      });

      socket.on('RemovePending', function(data) {
        serverlist.RemovePendingListing(data);
      });
      
      socket.on('StartPendingMatch', function(data) {
          socket.emit('MatchApproved', serverlist.StartPendingMatch(data));
      });
      
      socket.on('EnablePaypal', function(data) {
        paypal.Enable(data, function(err) {
          if(err)
            console.log("Failed to enable paypal: " + err);
          else
            console.log("paypal enabled for this run.");
        });
      });

      socket.on('RemoveSavedCC', function(data) {
        paypal.RemoveSavedCC(data, function(err) {
          if(err)
            console.log("Failed to remove saved card: " + err);
          else
            console.log("saved card data removed for user " + data.AccID);
        });
      });
    
      socket.on('SaveCardData', function(data) {
        paypal.SaveCardData(data, function(err, cID) {
          paypal.UpdateCardDataInDB(data, cID, function(dbResult) {
            if(dbResult != 1){
              console.log("Failed to save card data to db: " + dbResult);
              socket.emit('CardDataNotSaved', null);
            }
            else{
              console.log("Card info saved");
              socket.emit('CardDataSaved', null);
            }
          });
        });
      });

      socket.on('LogItemEvent', function(item){
        gamecommands.LogItemEvent(item,function(error){
          if(error){
            console.log("failed to log item: " + error);
          }
        });
      });

      socket.on('AddAccount', function(account){
        gamecommands.AddAccount(account, function(error){
          if(error){
            console.log("failed to create account: " + error);
            socket.emit('AccountCreateFail', null);
            return;
          }

          socket.emit('AccountCreateSuccess', null);
        });
      });

      socket.on('LogCurrencyChange', function(change){
        gamecommands.LogCurrencyChange(change,function(error){
          if(error){
            console.log("failed to log currency change: " + error);
          }
        });
      });

      socket.on('RetrievePlayerID', function(acct){
        gamecommands.RetrievePlayerID(acct,function(result, ID){
          if(result == true){
            socket.emit('PlayerID',  {Data:String(ID)});
          }
          else{
            socket.emit('PlayerID',  {Data:"-1"});
          }
        });
      });

      socket.on('LoadPlayerName', function(pname){
        gamecommands.LoadPlayerName(pname,function(result, Name){
          if(result == true){
            socket.emit('PlayerName', {Data:Name});
          }
          else{
            socket.emit('PlayerName', {Data:''});
          }
        });
      });

      socket.on('GetAccountItemCount', function(obj){
        gamecommands.GetAccountItemCount(obj,function(retObj){
          socket.emit('AccountItemCount', retObj);
        });
      });

      socket.on('GetCurrency', function(obj){
        gamecommands.GetCurrency(obj,function(retObj){
          socket.emit('Currency', retObj);
        });
      });

      socket.on('GetCardData', function(obj){
        gamecommands.GetCardData(obj,function(retObj){
          socket.emit('CardData', retObj);
        });
      });

      socket.on('GetLoginInfo', function(obj){
        gamecommands.GetLoginInfo(obj,function(retObj){
          socket.emit('LoginInfo', retObj);
        });
      });

      socket.on('DoLoginCheck', function(obj){
        gamecommands.DoLoginCheck(obj,function(retObj){
          socket.emit('Login', {Data:retObj});
        });
      });
    
      socket.on('AuthorizeServer', function(obj){
        gamecommands.AuthorizeServer(obj,function(retObj){
          socket.emit('Authorized', {Data:retObj});
        });
      });

      socket.on('SaveMatchDetails', function(obj){
        gamecommands.SaveMatchDetails(obj,function(retObj){
          socket.emit('Details', {Data:retObj});
        });
      });

      socket.on('SaveLevelSelection', function(obj){
        gamecommands.SaveLevelSelection(obj,function(retObj){
          socket.emit('LevelSelection', {Data:retObj});
        });
      });

      socket.on('TestName', function(obj){
        gamecommands.TestName(obj,function(retObj){
          socket.emit('NameTestResult', {Data:retObj});
        });
      });

      socket.on('GetPlayerInfo', function(obj){
        gamecommands.GetPlayerInfo(obj,function(retObj){
          socket.emit('PlayerInfo', retObj);
        });
      });

      socket.on('GetEquipmentPreset', function(obj){
        gamecommands.GetEquipmentPreset(obj,function(retObj){
          socket.emit('EquipmentPreset', retObj);
        });
      });

      socket.on('SavePlayerInfo', function(obj){
        gamecommands.SavePlayerInfo(obj);
      });

      socket.on('SaveEquipmentPreset', function(obj){
        gamecommands.SaveEquipmentPreset(obj);
      });

      socket.on('GetStoreData', function(obj){
        gamecommands.GetStoreData(obj,function(retObj){
          socket.emit('StoreData', retObj);
        });
      });

      socket.on('BuyNLogicPoints', function(data) {
        paypal.FixFundingInstrument(data, function(fundingErr){
          if(fundingErr) {
            console.log("problem determining funding instrument: " + fundingErr);
            socket.emit('PointPurchaseFailed', null);
            return;
          }

        paypal.BuyNLogicPoints(data, function(err, resp){
          if(err) {
            console.log("problem buying points: " + err);
            console.log(JSON.stringify(resp));
            socket.emit('PointPurchaseFailed', null);
            return;
          }
          if(resp) {
            console.log("no problem with purchase... handle result...");
            if(resp.state == "approved")
            {
              paypal.LogTransactionDetails(resp, data, function(transErr) {
                if(transErr){
                  console.log("failed to log purchase in our DB: " + transErr);
                  socket.emit('PointPurchaseFailed-Bad', null);
                  //for PCI compliance we can't be emailing out people's card info, paypal should have this info in their records anyway
                  if(data.credit_card)
                    data.credit_card = null;
                    
                  smtpTransport.sendMail({
                       from: "NLogic Paypal Interface Webserver <contact@nlogicstudios.com>", // sender address
                       to: "NLogic Customer Service <contact@nlogicstudios.com>", // comma separated list of receivers
                       subject: "Failed to log transaction in database", // Subject line
                       text: "Paypal authorization succeeded so the card was charged but we failed to record it in our DB so they paid us for nothing. Paypal response object: " + JSON.stringify(resp) + ".... APG-Created data object (card data nulled): " + JSON.stringify(data)  // plaintext body
                    }, function(error, response){
                       if(error){
                         console.log(error);
                       }else{
                         console.log("Message sent: " + response.message);
                       }
                    });
                  return;
                }
                
                console.log("logged in DB");
                socket.emit('PointPurchaseComplete', null);
              });
            }
            else
            {
              console.log("authorization failed; state = " + paypalResp.state);
              socket.emit('PointPurchaseFailed', null);
            }
          }
          else {
            console.log("wtf, find Adam@NLogic and investigate");
          }
        });
      });
      });
    });
  //});
//});