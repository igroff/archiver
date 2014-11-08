var express         = require('express');
var morgan          = require('morgan');
var connect         = require('connect');
var connectTimeout  = require('connect-timeout');
var log             = require('simplog');
var fs              = require('fs');
var path            = require('path');

var config = {
  storageRoot: process.env.STORAGE_ROOT
}

var currentRequestCounter = 0;

function uniqueId(){
  return process.pid + "." + new Date().getTime() + "." + currentRequestCounter++;
}

var app = express();
app.use(morgan('combined'));


app.get('/diagnostic', function(req, res){
  var diagMessage = {message: "ok"};
  diagMessage.storageRoot = (config.storageRoot && "set") || "notFound";
  if (diagMessage.storageRoot === "notFound"){
    diagMessage = error;
    rs.status(500);
  }
  res.send(diagMessage);
});

app.post('/archive', function(req, res){ 
  var id = uniqueId();
  var tempFileName = path.join(config.storageRoot, id + ".inproc");
  var finalFileName = path.join(config.storageRoot, id + ".complete");
  var outputStream = fs.createWriteStream(tempFileName);

  outputStream.on('finish', function(){
    fs.rename(tempFileName, finalFileName, function(err){
      if (err){
        res.status(500).send({message:err});
      } else {
        res.send({message: "ok"});
      }
    });
  });
  req.pipe(outputStream);
  req.on('end', function(){ outputStream.end(); });
});


// the only thing we do is store incoming data, so you need to have an existing
// place to put it, if it doesn't exist, we'll log and die
if (! fs.existsSync(config.storageRoot) ){
  log.error("storage root " + config.storageRoot + " not found, exiting");
  process.exit(1);
}

// start up our server
listenPort = process.env.PORT || 3000;
log.info("starting app " + process.env.APP_NAME);
log.info("listening on " + listenPort);
log.info("config: ", config);
app.listen(listenPort);
