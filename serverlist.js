var Games = {};
var PendingGames = {};
var Heartbeats = [];
var GamesToHearts = {};
var GameCount = 0;
var NextID = 0;
var HeartBeatInterval = 30000;
var timerHandle = setInterval(Thump, HeartBeatInterval);
var servertimeout = 180000;

var mysql = require('mysql');
var pool = mysql.createPool({
    host : '',//removed
    port : '3306',
    user : 'APGWebServer',
    password : '',//removed
    database : 'APG'
    });

function AddListingToServer(data)
{
    console.log("AddListingToServer" + JSON.stringify(data));
    if(data.ID != -1)
    {
        console.log("error: Trying to add server listing with known ID: " + data.ID);
    }
    else
    {
        data.ID = NextID;
        NextID++;
        var game = Games[data.ID];
        if(game === undefined || game === null)
        {
            Games[data.ID] = data;
            GamesToHearts[data.ID] = Heartbeats.length;
            Heartbeats[Heartbeats.length] = { Life: 0, ID: data.ID };
            
            GameCount++;
        }
        else
        {
            console.log("Error: unique ID is not unique: " + data.ID);
            return;
        }
        
    }
}

exports.AddPendingListing = function(data)
{
    console.log("AddPendingListing");
    if(data.ID != -1)
    {
        console.log("error: trying to set a pending match when it already has an id");
    }
    else
    {
        var listing = PendingGames[data.IP + data.ClientPID];
        console.log("listing identified as: " + data.IP + data.ClientPID);
        if(listing === undefined || listing === null)
        {
            PendingGames[data.IP + data.ClientPID] = data;
            return true;
        }
    }
    return false;
}

exports.RemovePendingListing = function(data)
{
    console.log("RemovePendingListing");
    var listing = PendingGames[data.IP + data.ClientPID];
    if(listing !== undefined && listing !== null)
    {
        PendingGames[data.IP + data.ClientPID] = null;
        return true;
    }
}

exports.StartPendingMatch = function(IPPID)
{
    console.log("StartPendingMatch");
    var listing = PendingGames[IPPID];
    console.log("looking at listing: " + IPPID);
    if(listing !== undefined && listing !== null)
    {
        PendingGames[IPPID] = null;
        AddListingToServer(listing);
        return listing;
    }
    
    return null;
}

function RemoveListingFromServer(data)
{
    console.log("RemoveListingFromServer");
    if(data.ID == -1)
    {
        console.log("error: trying to remove listing without ID");
    }
    else
    {
        var game = Games[data.ID];
        if(game !== undefined && game !== null)
        {
            DropServerAuthorization(game);
            Games[data.ID] = null;
            GamesToHearts[data.ID] = null;
            GameCount--;
        }
    }
}

exports.Heartbeat = function(data)
{
    console.log("Heartbeat");
    if(data.ID == -1)
    {
        console.log("error: trying to update listing without ID");
    }
    else
    {
        var game = Games[data.ID];

        console.log("Heartbeat for " + game);
        if(game !== undefined && game !== null)
        {
            game.Players = data.Players;
            game.Map = data.Map;
            var heartid = GamesToHearts[data.ID];
            if(heartid !== undefined && heartid !== null)
            {
                var heart = Heartbeats[heartid];
                if(heart !== undefined && heart !== null)
                {
                    heart.Life = 0;
                }
            }
            
        }
    }
}

function Thump()
{
    console.log("Thump");
    var tempAr = [];
    for(var index = 0; index < Heartbeats.length; index++)
    {
        var heart = Heartbeats[index];
        heart.Life += HeartBeatInterval;
        if(heart.Life > servertimeout)
        {
            RemoveListingFromServer(Games[heart.ID]);
        }
        else
        {
            tempAr[tempAr.length] = heart;
        }
    }
    
    Heartbeats = tempAr;
}

exports.EmitMetaData = function(socket) {
    console.log("EmitMetaData");
    var data = { ListCount:GameCount };
    socket.emit('ServerlistMetaData', data);
}

exports.ResendListings = function(socket) {
    for(var index = 0; index < Heartbeats.length; index++)
    {
        var heart = Heartbeats[index];
        var game = Games[heart.ID];
        if(game !== undefined && game !== null)
        {
            socket.emit('UpdateServerListing',game);
        }
    }
}

//fix/use/whatever
function DropServerAuthorization(listing)
{
    pool.getConnection(function(err, connection){
        if(err){
            console.log(err);
            cb(err);
            return;
        }
        
        var params = [listing.OwnerID, listing.ClientPID];
        console.log("dropping server " + params + " from list.");
        connection.query("call DropServerAuthorization(" + connection.escape(params) + ")", function(err, rows, fields){
            if(err) {
                console.log(err);
            }
        });
        
        connection.release();
    });
}