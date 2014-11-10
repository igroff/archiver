var express         = require('express');
var morgan          = require('morgan');
var connect         = require('connect');
var connectTimeout  = require('connect-timeout');
var log             = require('simplog');
var fs              = require('fs');
var path            = require('path');

var config = {
  storageRoot: process.env.STORAGE_ROOT,
  s3: {
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    BUCKET: process.env.S3_BUCKET
  }
}

var currentRequestCounter = 0;

/* The whole goal of this app is to take data and save it to a persistent 
 * location for long-term storage and reference (archiving). This provides a
 * way of generating a file name that's intended to be both non-conflicting and
 * somewhat discoverable
 */
function generateFileName(key){
  return key +
    "." +
    new Date().toString().replace(/ /g, "_") + 
    "." +
    process.pid +
    "." +
    currentRequestCounter++;
}

/* Write the contents of the provided stream to the filesystem using
 * the name specified.  This method writes the file first to a temp location
 * ( which is a sibling of the final file ) named <fileName>.inproc so that
 * files that are in the process of being written, or have somehow failed
 * can be easily identified
 */
function writeToFilesystem(inputStream, fileName, cb){
  var tempFileName = fileName + ".inproc";
  var finalFileName = fileName; 
  var outputStream = fs.createWriteStream(tempFileName);

  inputStream.on('end', function(){ outputStream.end(); });
  outputStream.on('finish', function(){
    fs.rename(tempFileName, finalFileName, cb);
  });
  inputStream.pipe(outputStream);
}

/* Write the contents of the provided stream to s3 ( as configured by
 * the config.s3 object )
 */
function writeToS3(inputStream, fileName, cb){
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
  var appKey = req.query.key || null;
  if (!appKey){
    res.status(500).send({message:"need to provide a key in the querystring"});
    return;
  }
  var fileName = path.join(config.storageRoot, generateFileName(appKey))
  writeToFilesystem(req, fileName, function(err){
    if (err){
      res.status(500).send({message:err});
    } else {
      res.send({message: "ok"});
    }
  });
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
log.debug("config: ", config);
app.listen(listenPort);
