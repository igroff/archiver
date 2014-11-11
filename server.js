var express         = require('express');
var morgan          = require('morgan');
var log             = require('simplog');
var fs              = require('fs');
var path            = require('path');
var AWS             = require('aws-sdk');

var config = {
  // if set, the path provided will be used to store archived items, if not
  // set we'll be requiring an s3 configuration
  storageRoot: process.env.STORAGE_ROOT,
  // if you find yourself running a bunch of these you can set this value
  // to something different for each instance to make sure you get distinct
  // file naming. The 'normal' naming algorithm is unlikely to collide, but
  // this, if set different per instance, will guarantee no collisions.
  uniqueId: process.env.FILE_UNIQUE_ID | process.pid,
  s3: {
    accessKey: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION
  }
}

// used to help generate a unique filename for each request
var currentRequestCounter = 0;

/* The whole goal of this app is to take data and save it to a persistent 
 * location for long-term storage and reference (archiving). This provides a
 * way of generating a file name that's intended to be both non-conflicting and
 * somewhat discoverable.
 */
function generateFileName(key){
  return key +
    "." +
    new Date().toString().replace(/ /g, "_") + 
    "." +
    process.pid +
    "." + 
    config.uniqueId +
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
  fileName = path.join(config.storageRoot, generateFileName(appKey))
  var tempFileName = fileName + ".inproc";
  var finalFileName = fileName; 
  var outputStream = fs.createWriteStream(tempFileName);

  inputStream.on('end', function(){ outputStream.end(); });
  outputStream.on('finish', function(){
    fs.rename(tempFileName, finalFileName, cb);
  });
  inputStream.pipe(outputStream);
}

function isS3ConfigValid(){
  return config.s3.AWS_ACCESS_KEY_ID
    && config.s3.AWS_SECRET_ACCESS_KEY
    && config.s3.BUCKET_NAME
}

/* Write the contents of the provided stream to s3 ( as configured by
 * the config.s3 object )
 */
function writeToS3(inputStream, fileName, cb){
  var putConfig = {
    Key: fileName,
    Bucket: config.s3.bucket,
    Body: inputStream,
    ContentLength: parseInt(inputStream.headers['content-length'], 10),
    ContentType: inputStream.get('content-type')
  };
  log.debug("dest bucket: %s key: %s", putConfig.Bucket, putConfig.Key);
  var s3 = new AWS.S3();
  s3.putObject(putConfig, cb);
}

var app = express();
app.use(morgan('combined'));

app.get('/diagnostic', function(req, res){
  var diagMessage = {message: "ok"};
  diagMessage.storage = config.storageSystem
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
  //var fileName = path.join(config.storageRoot, generateFileName(appKey))
  var fileName = generateFileName(appKey);
  writeToS3(req, fileName, function(err, response){
    if (err){
      log.error(err);
      log.error(response);
      return res.status(500).send({message:err});
    } else {
      return res.send({message: "ok"});
    }
  });
});


if (config.storageRoot) { // we're gonna use a file system storage location
  // the only thing we do is store incoming data, so you need to have an existing
  // place to put it, if it doesn't exist, we'll log and die
  if (! fs.existsSync(config.storageRoot) ){
    log.error("storage root " + config.storageRoot + " not found, exiting");
    process.exit(1);
  }
  config.storageSystem = "filesystem";
} else { // otherwise, we're gonna need to have a good s3 config
  if ( ! isS3ConfigValid() ){
    log.error("invalid s3 configuration");
    process.exit(2); 
  }
  AWS.config.region = config.s3.region;
  config.storageSystem = "s3";
}

listenPort = process.env.PORT || 3000;
log.info("starting app '" + process.env.APP_NAME + "'");
log.info("listening on " + listenPort);
log.debug("config: ", config);
app.listen(listenPort);
