var mysql = require('mysql');
var pool = mysql.createPool({
	host : '',//removed with shutdown
	port : '3306',
	user : 'APGWebServer',
	password : '',//removed with shutdown
	database : 'apg'
	});

exports.LogItemEvent = function(item, cb)
{
	areMySqlCredentialsValid_Item(item, function(result) {
		if(result != 1){
			cb("cannot process metrics without valid user authentification item; returned: " + result);
			return;
		}
		pool.getConnection(function(err, connection) {
			if(err) {
				console.log(err)
				cb(err);
				return;
			}
			
			var params = [item.ServerPID, item.OwnerID, item._EventID, item._PlayerID, item._ItemID, 
							item._Occurance, item._ServerIP, item._Progression];
			connection.query("call LogItemEvent(" + connection.escape(params) + ")" ,function(err, rows, fields) {
				if(err) {
					console.log(err);
					cb(err)
				}
				else {	
					cb();
				}
			});
			
			connection.release();
		});
	});
}

exports.AddAccount = function (account, cb)
{
	pool.getConnection(function(err, connection) {
		if(err) {
			console.log(err)
			cb(err);
			return;
		}

		var params = [account.DesiredName, account.DesiredSaltString, account.DesiredHashString, account.GameName];
		connection.query("call AddAccountWeb(" + connection.escape(params) + ")" ,function(err, rows, fields) {
			if(err) {
				console.log(err);
				cb(err)
			}
			else if(rows[0][0].result != 1){
				cb("username taken");
			}
			else {	
				cb();
			}
		});
		
		connection.release();
	});
}

exports.LogCurrencyChange = function(change, cb)
{
	pool.getConnection(function(err, connection) {
		if(err) {
			console.log(err)
			cb(err);
			return;
		}

		var params = [change.AccID, change.AuthString, change.CurrencyChange, change.Occurance];
		connection.query("call LogCurrencyChangeWeb(" + connection.escape(params) + ")" ,function(err, rows, fields) {
			if(err) {
				console.log(err);
				cb(err)
			}
			else if(rows[0][0].result != 1){
				cb("credentials invalid");
			}
			else {	
				cb();
			}
		});
		
		connection.release();
	});
}

exports.RetrievePlayerID = function(acct, cb)
{
	pool.getConnection(function(err, connection) {
		if(err) {
			console.log(err)
			cb(err);
			return;
		}

		var params = [acct.AccountName, acct.AuthString];
		connection.query("call RetrievePlayerIDWeb(" + connection.escape(params) + ")" ,function(err, rows, fields) {
			if(err) {
				console.log(err);
				cb(false)
			}
			else if(rows[0][0].result != 1){
				//console.log("failed to get playerid");
				cb(false);
			}
			else {	
				//console.log("retrieved player id " + rows[0][0].ID);
				cb(true, rows[0][0].ID);
			}
		});
		
		connection.release();
	});
}

exports.LoadPlayerName = function(pname, cb)
{
	pool.getConnection(function(err, connection) {
		if(err) {
			console.log(err)
			cb(err);
			return;
		}

		var params = [pname.AccountID];
		connection.query("call GetPlayerNameWeb(" + connection.escape(params) + ")" ,function(err, rows, fields) {
			if(err) {
				console.log(err);
				cb(false)
			}
			else if(rows[0][0].result != 1){
				//console.log("failed to get playername");
				cb(false);
			}
			else {	
				//console.log("retrieved player name " + rows[0][0].DisplayName);
				cb(true, rows[0][0].DisplayName);
			}
		});
		
		connection.release();
	});
}


exports.GetAccountItemCount = function(count, cb)
{
	pool.getConnection(function(err, connection) {
		if(err) {
			console.log(err)
			cb(err);
			return;
		}

		var params = [count.AccountID, count.AuthString, count.ItemType];
		connection.query("call GetAccountItemCountWeb(" + connection.escape(params) + ")" ,function(err, rows, fields) {
			if(err) {
				console.log(err);
			}
			else if(rows[0][0].result != 1){
				//console.log("failed to get item count");
				count.Count = 0;
			}
			else {	
				//console.log("retrieved item count " + rows[0][0].Count);
				count.Count = rows[0][0].Count;
			}

			cb(count);
		});
		
		connection.release();
	});
}

exports.GetCurrency = function(curr, cb)
{
	pool.getConnection(function(err, connection) {
		if(err) {
			console.log(err)
			cb(err);
			return;
		}

		var params = [curr.AccountID, curr.AuthString];
		connection.query("call GetCurrencyWeb(" + connection.escape(params) + ")" ,function(err, rows, fields) {
			if(err) {
				console.log(err);
			}
			else if(rows[0][0].result != 1){
				//console.log("failed to get item count");
				curr.Amount = 0;
			}
			else {	
				//console.log("retrieved item count " + rows[0][0].Count);
				curr.Amount = rows[0][0].Amount;
			}

			cb(curr);
		});
		
		connection.release();
	});
}

exports.GetCardData = function(card, cb)
{
	pool.getConnection(function(err, connection) {
		if(err) {
			console.log(err)
			cb(err);
			return;
		}

		var params = [card.AccountID, card.AuthString];
		connection.query("call GetCardDataWeb(" + connection.escape(params) + ")" ,function(err, rows, fields) {
			if(err) {
				console.log(err);
			}
			else if(rows[0][0].result == 1){
				//console.log("retrieved item count " + rows[0][0].Count);
				card.Digits = rows[0][0].Digits;
				card.Type = rows[0][0].Type;
			}

			cb(card);
		});
		
		connection.release();
	});
}

//don't copy this one as a template
exports.GetLoginInfo = function(info, cb)
{
	pool.getConnection(function(err, connection) {
		if(err) {
			console.log(err)
			cb(err);
			return;
		}

		var params = [info.AccountName];
		connection.query("call GetLoginInfoWeb(" + connection.escape(params) + ")" ,function(err, rows, fields) {
			if(err) {
				console.log(err);
			}
			else if(rows[0][0].Result == 1){
				//console.log("retrieved item count " + rows[0][0].Count);
				info.SaltString = rows[0][0].Salt;
				info.bUseResetPassword = rows[0][0].bUseResetPassword;
				info.HashLength = rows[0][0].HashLength;
				info.ResetSaltString = rows[0][0].ResetSalt;
			}
			else
			{
				console.log("GetLoginInfo Error: " + rows[0][0].Result);
			}

			cb(info);
		});
		
		connection.release();
	});
}

exports.GetStoreData = function(data, cb)
{
	pool.getConnection(function(err, connection) {
		if(err) {
			console.log(err)
			cb(err);
			return;
		}

		var params = [data.AccountID, data.AuthString];
		connection.query("call GetStoreData(" + connection.escape(params) + ")" ,function(err, rows, fields) {
			if(err) {
				console.log(err);
			}
			else if(rows.length > 0 && rows[0].length > 0){
				for(var index=0; index < rows[0].length; index++)
				{
					data.StoreListings[index] = {};
					data.StoreListings[index].ID = rows[0][index].StoreID;
					data.StoreListings[index].state = rows[0][index].State;
					data.StoreListings[index].cost = rows[0][index].Cost;
					data.StoreListings[index].title = rows[0][index].Title;
					data.StoreListings[index].sale = rows[0][index].Sale;
					data.StoreListings[index].gameID = rows[0][index].GameID;
					data.StoreListings[index].category = rows[0][index].Category;
				}
			}

			cb(data);
		});
		
		connection.release();
	});
}

exports.DoLoginCheck = function(info, cb)
{
	pool.getConnection(function(err, connection) {
		if(err) {
			console.log(err)
			cb(err);
			return;
		}

		var params = [info.AccountName, info.TestHashString, info.AuthHashString, info.bIsResetTest];
		//console.log("AuthHashString: " + info.AuthHashString);
		connection.query("call DoLoginCheckWeb(" + connection.escape(params) + ")" ,function(err, rows, fields) {
			if(err) {
				console.log(err);
			}
			if(rows[0][0].Result != 1)
			{
				console.log("Failed DoLoginCheckWeb: " + rows[0][0].Result);
			}
			cb(rows[0][0].Result);
		});
		
		connection.release();
	});
}

exports.AuthorizeServer = function(info, cb)
{
	pool.getConnection(function(err, connection) {
		if(err) {
			console.log(err)
			cb(err);
			return;
		}

		var params = [info.ID, info.AuthHashString, info.SPID, info.CPID];
		//console.log("AuthHashString: " + info.AuthHashString);
		connection.query("call AuthorizeServerWeb(" + connection.escape(params) + ")" ,function(err, rows, fields) {
			if(err) {
				console.log(err);
			}
			if(rows[0][0].Result != 1)
			{
				console.log("Failed AuthorizeServerWeb: " + rows[0][0].Result);
			}
			cb(rows[0][0].Result);
		});
		
		connection.release();
	});
}

exports.SaveMatchDetails = function(info, cb)
{
	pool.getConnection(function(err, connection) {
		if(err) {
			console.log(err)
			cb(err);
			return;
		}

		var params = [info.AccountID, info.AuthString, info.StartingCredits, info.Slots, info.LevelCount, info.Randomized, info.MinSpawnCredits];
		console.log("SaveMatchDetails: " + JSON.stringify(info));
		connection.query("call SaveMatchDetailsWeb(" + connection.escape(params) + ")" ,function(err, rows, fields) {
			if(err) {
				console.log(err);
			}
			if(rows[0][0].Result < 0)
			{
				console.log("Failed SaveMatchDetailsWeb: " + rows[0][0].Result);
			}
			cb(rows[0][0].Result);
		});
		
		connection.release();
	});
}

exports.SaveLevelSelection = function(info, cb)
{
	pool.getConnection(function(err, connection) {
		if(err) {
			console.log(err)
			cb(err);
			return;
		}

		var params = [info.AccID, info.AuthString, info.Level, info.Index, info.OwnerID];
		//console.log("AuthHashString: " + info.AuthHashString);
		connection.query("call SaveLevelSelectionWeb(" + connection.escape(params) + ")" ,function(err, rows, fields) {
			if(err) {
				console.log(err);
			}
			if(rows[0][0].Result != 1)
			{
				console.log("Failed login: " + rows[0][0].Result);
			}
			cb(rows[0][0].Result);
		});
		
		connection.release();
	});
}

exports.TestName = function(info, cb)
{
	pool.getConnection(function(err, connection) {
		if(err) {
			console.log(err)
			cb(err);
			return;
		}

		var params = [info.TestName];
		//console.log("AuthHashString: " + info.AuthHashString);
		connection.query("call IsNameTaken(" + connection.escape(params) + ")" ,function(err, rows, fields) {
			if(err) {
				console.log(err);
			}
			cb(rows[0][0].Result);
		});
		
		connection.release();
	});
}

exports.GetPlayerInfo = function(info, cb)
{
	pool.getConnection(function(err, connection) {
		if(err) {
			console.log(err)
			cb(err);
			return;
		}

		var params = [info.AccountID, info.AuthString];
		//console.log("AuthHashString: " + info.AuthHashString);
		connection.query("call GetPlayerInfoWeb(" + connection.escape(params) + ")" ,function(err, rows, fields) {
			if(err) {
				console.log("ERROR ON GetPlayerInfoWeb: " + err);
			}
			if(rows[0].Count == 0)
			{
				console.log("GetPlayerInfoWeb returned 0 results");
				cb(info);
			}
			else
			{
				info.DisplayName = rows[0][0].DisplayName;
				info.PlayerColor = rows[0][0].PlayerColor;
				info.bPlayMenuMusic = rows[0][0].bPlayMenuMusic;
				info.SavedChallengeID = rows[0][0].SavedChallengeID;

				info.PrefItem1 = rows[0][0].PrefItem1;
				info.PrefItem2 = rows[0][0].PrefItem2;
				info.PrefItem3 = rows[0][0].PrefItem3;
				info.PrefItem4 = rows[0][0].PrefItem4;
				info.PrefItem5 = rows[0][0].PrefItem5;

				info.EquipmentPresetID1 = rows[0][0].EquipmentPresetID1;
				info.EquipmentPresetID2 = rows[0][0].EquipmentPresetID2;
				info.EquipmentPresetID3 = rows[0][0].EquipmentPresetID3;
				info.EquipmentPresetID4 = rows[0][0].EquipmentPresetID4;

				info.ShoulderDecal = rows[0][0].ShoulderDecal;
				info.BackDecal = rows[0][0].BackDecal;
				info.ScoreDecal = rows[0][0].ScoreDecal;

				cb(info);
			}
		});
		
		connection.release();
	});
}

exports.GetEquipmentPreset = function(info, cb)
{
	pool.getConnection(function(err, connection) {
		if(err) {
			console.log(err)
			cb(err);
			return;
		}

		var params = [info.AccountID, info.AuthString, info.SQLID];
		console.log("GetEquipmentPreset " + JSON.stringify(params));
		connection.query("call GetEquipmentPresetWeb(" + connection.escape(params) + ")" ,function(err, rows, fields) {
			if(err) {
				console.log(err);
			}
			if(rows !== undefined || rows[0] !== undefined)
			{
				info.DisplayName = rows[0][0].DisplayName;
				info.Weapon1 = rows[0][0].Weapon1;
				info.Weapon2 = rows[0][0].Weapon2;
				info.Accessory1 = rows[0][0].Accessory1;
				info.Accessory2 = rows[0][0].Accessory2;
				info.Accessory3 = rows[0][0].Accessory3;
			}

			cb(info);
		});
		
		connection.release();
	});
}

exports.SavePlayerInfo = function(info, cb)
{
	pool.getConnection(function(err, connection) {
		if(err) {
			console.log(err)
			cb(err);
			return;
		}

		var params = [info.AccountID, info.AuthString, info.DisplayName, info.PlayerColor, info.PrefItem1, info.PrefItem2, info.PrefItem3, 
						info.PrefItem4, info.PrefItem5, info.EquipmentPresetID1, info.EquipmentPresetID2, info.EquipmentPresetID3, info.EquipmentPresetID4];
		console.log("SavePlayerInfo " + JSON.stringify(params));
		connection.query("call SavePlayerInfoWeb(" + connection.escape(params) + ")" ,function(err, rows, fields) {
			if(err) {
				console.log(err);
			}
		});
		
		connection.release();
	});
}

exports.SaveEquipmentPreset = function(info, cb)
{
	pool.getConnection(function(err, connection) {
		if(err) {
			console.log(err)
			cb(err);
			return;
		}

		var params = [info.AccountID, info.AuthString, info.SQLID, info.DisplayName, info.Weapon1, info.Weapon2, info.Accessory1, info.Accessory2, info.Accessory3];
		connection.query("call SaveEquipmentPresetWeb(" + connection.escape(params) + ")" ,function(err, rows, fields) {
			if(err) {
				console.log(err);
			}
		});
		
		connection.release();
	});
}

function areMySqlCredentialsValid_Item(item, cb)
{
	console.log("areMySqlCredentialsValid_Item; " + itam.ServerPID + " " + item.OwnerID);
	if(item.ServerPID && item.OwnerID)
	{
		pool.getConnection(function(err, connection) {
			if(err) {
				console.log(err)
				cb(err);
				return;
			}
			
			var params = [item.ServerPID, item.OwnerID];
			connection.query("call VerifyServerToken(" + connection.escape(params) + ")" ,function(err, rows, fields) {
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
