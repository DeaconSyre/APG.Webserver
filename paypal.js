var mysql = require('mysql');
var pool = mysql.createPool({
	host : '',//removed 
	port : '3306',
	user : 'APGWebServer',
	password : '',//removed
	database : 'apg'
	});

var sdk = require('paypal-rest-sdk');

	//todo:get these values from somewhere safe, maybe openshift mysql gear?
var options = {
	host: "api.sandbox.paypal.com",
	client_id: "get from somewhere secure",
	client_secret: "get from somewhere secure"
}

exports.BuyNLogicPoints = function(data, cb)
{
	areMySqlCredentialsValid(data, function(result) {
		if(result != 1){
			cb("cannot process sales without valid user authentification data; returned: " + result);
			return;
		}
		
		sdk.configure(options);
		var payment = {
			intent: "sale",
			payer: {
				payment_method: "credit_card"
			},
			transactions: [{
				amount: {
					currency: "USD"
				},
				description: "This is the payment description."
			}]
		};
			
		if(data.credit_card)
		{
			payment.payer.funding_instruments = [{credit_card : data.credit_card}];
			//todo: move all this stuff into the pipeline -- after we determine if we need it since it seems we don't
			/*payment.payer.funding_instruments[0].credit_card.billing_address = {			
				"line1":"my address",
				"city":"Boston",
				"country_code":"US",
				"postal_code":"15935",
				"state": "MA"
			};*/
		}
		else if(data.credit_card_token)
		{
			payment.payer.funding_instruments = [{credit_card_token : data.credit_card_token}];
		}
		else
		{
			cb("no funding intrument provided, sale failed");
			return;
		}
		
		if(data.bundleID){
			getBundleDetails(data.bundleID, function(err, points, cost) {
				if(err){
					console.log("Aborting purchase");
					cb(err);
				}
				else {
					payment.transactions[0].amount.total = cost.toString();
					payment.transactions[0].description = points + " NLogic Points";
					data.points = points;
					
					console.log(JSON.stringify(payment));
					sdk.payment.create(payment, options, cb);
				}
			});
		}
		else {
			cb("unable to determine bundle details");
		}
	});
}

//cb:  function(err, cID)
exports.SaveCardData = function(data, cb)
{
	areMySqlCredentialsValid(data, function(result) {
		if(result != 1){
			cb("cannot process sales without valid user authentification data; returned: " + result);
			return;
		}
		
		sdk.configure(options);
		if(data.credit_card){
			data.credit_card.payer_id = "APGCustomer" + data.AccID;
			sdk.credit_card.create(data.credit_card, options, function(err, resp) {
				if(err){
					console.log("failed to store credit card: " + err);
					cb(err);
				}
				else if(resp.state == 'ok'){
					console.log("funding instrument valid until: " + resp.valid_until);
					console.log("card id: " + resp.id);
					cb(undefined, resp.id);
				}
				else{
					cb("stored card status is expired");
				}
			});
		}
		else {
			cb("credit card data not present");
		}
	});
}

//cb:  function(dbResult)
exports.UpdateCardDataInDB = function(data, cID, cb)
{
	pool.getConnection(function(err, connection){
		if(err){
			console.log(err);
			cb(err);
			return;
		}
		
		var params = [data.AccID, data.AuthString, cID, data.credit_card.number.substr(-4), data.credit_card.type];
		connection.query("call SaveCardData(" + connection.escape(params) + ")", function(err, rows, fields){
			if(err) {
				console.log(err);
				cb(err)
			}
			else {	
				cb(rows[0][0].result);
			}
		});
		
		connection.release();
	});
}

//cb: function(err, cID)
function GetCardID(data, cb)
{
	pool.getConnection(function(err, connection){
		if(err){
			console.log(err);
			cb(err);
			return;
		}
		
		var params = [data.AccID, data.AuthString];
		connection.query("call GetCardID(" + connection.escape(params) + ")", function(err, rows, fields){
			if(err) {
				console.log(err);
				cb(err)
			}
			else {	
				cb(undefined, rows[0][0].result);
			}
		});
		
		connection.release();
	});
}

function areMySqlCredentialsValid(data, cb)
{
	console.log("areMySqlCredentialsValid; " + data.AccID + " " + data.AuthString);
	if(data.AccID && data.AuthString)
	{
		pool.getConnection(function(err, connection) {
			if(err) {
				console.log(err)
				cb(err);
				return;
			}
			
			var params = [data.AccID, data.AuthString];
			connection.query("call VerifyAccountToken(" + connection.escape(params) + ")" ,function(err, rows, fields) {
				if(err) {
					console.log(err);
					cb(err)
				}
				else {	
					cb(rows[0][0].result);
				}
			});
			
			connection.release();
		});
	}
	else
	{
		cb(0);
	}
}

exports.LogTransactionDetails = function(response, data, cb)
{
	var params = [data.AccID, data.AuthString, data.points, response.id, response.create_time, response.update_time, response.state];
	if(response.state == "approved")
	{
		pool.getConnection(function(err, connection) {
			if(err) {
				console.log(err)
				cb(err);
				return;
			}
			
			connection.query("call LogCurrencyTransaction(" + connection.escape(params) + ")", function(err, rows, fields) {
				if(err) {
					console.log("LogCurrencyTransaction failed: " + err);
					cb("SQL Failure: " + err);
				}
				else if(rows[0][0].result != 1)
					cb("SQL Failure: " + rows[0][0].result);
				else
					cb();
			});
			connection.release();
		});
	}
	else
	{
		cb("sale not approved; state: " + response.state);
	}	
}

function getBundleDetails(bundleID, cb)
{
	pool.getConnection(function(err, connection) {
		if(err) {
			console.log(err)
			cb(err);
			return;
		}
		
		connection.query("call GetBundleDetails(" + connection.escape(bundleID) + ")", function(err, rows, fields) {
			if(err) {
				console.log("GetBundleDetails failed: " + err);
				cb("SQL Failure: " + err);
			}
			else if(rows[0][0] !== undefined){
				if(rows[0][0].Points !== undefined && rows[0][0].Points !== null &&
				  rows[0][0].Cost !== undefined && rows[0][0].Cost !== null) {
					cb(undefined,rows[0][0].Points, rows[0][0].Cost);
				}
				else {
					cb("Points: " + rows[0][0].Points + "; Cost: " + rows[0][0].Cost);
				}
			}
			else{
				cb("Bundle not found: " + bundleID);
			}
		});
		
		connection.release();
	});
}

//cb: function(err)
exports.FixFundingInstrument = function(data, cb)
{
	if(data.credit_card)
		cb();
	else {
		GetCardID(data, function(err, cID) {
			if(err)
				cb(err);
			else{
				data.credit_card_token = {
					credit_card_id : cID,
					payer_id : "APGCustomer" + data.AccID,
				};
				cb();
			}
		});
	}	
}

//cb: function(err)
exports.RemoveSavedCC = function(data, cb)
{
	pool.getConnection(function(err, connection) {
		if(err) {
			console.log(err)
			cb(err);
			return;
		}
		
		var params = [data.AccID, data.AuthString, "", 0, ""];
		connection.query("call SaveCardData(" + connection.escape(params) + ")", function(err, rows, fields) {
			if(err) {
				console.log("SaveCardData failed: " + err);
				cb("SQL Failure: " + err);
			}
			else
				cb();
		});
	});
}

exports.Enable = function(data, cb)
{
	pool.getConnection(function(err, connection) {
		if(err){
			console.log(err);
			cb(err);
			return;
		}

		var params = [data.AccID, data.AuthString];
		connection.query("call Auth_GetPaypalCredentials(" + connection.escape(params) + ")", function(err, rows, fields){
			if(err){
				console.log("Auth_GetPaypalCredentials failed: " + err);
				cb(err);
			}
			else if(rows[0][0] !== undefined){
				if(rows[0][0].result == 1){
					options.client_id = rows[0][0].id;
					options.client_secret = rows[0][0].secret;
					cb();
				} else {
					cb("failed to validate credentials");
				}
			} else {
				if(rows[0] !== undefined){
					cb("result set returned at rows[0]");
				} else {
					cb("result set returned empty");
				}
			}
		});
	});
}

/*var workingpayment = {
  "intent": "sale",
  "payer": {
	"payment_method": "credit_card",
	"funding_instruments": [
	  {
		"credit_card": {
		  "number": "5500005555555559",
		  "type": "mastercard",
		  "expire_month": 12,
		  "expire_year": 2018,
		  "cvv2": 111,
		  "first_name": "Joe",
		  "last_name": "Shopper"
		}
	  }
	]
  },
  "transactions": [
	{
	  "amount": {
		"total": "4.99",
		"currency": "USD"
	  },
	  "description": "This is the payment transaction description."
	}
  ]
}*/
/*"payer_info" : {
	"shipping_address" : {
		"recipient_name" : "temp",
		"type" : "residential",
	}
}*/