### Archiver

### What now?

The goal of this is painfully simple, allow folks POST data to the app knowing
that it will be stored in a location such that it will be available later for
reference.  That's all a fancy way of saying, you POST data to it and it will
save it for you.

You can post any data you can imagine to the system and it will save it for you
the catch is there's no magic, it saves what you send, the way you send it.  So
if you, for example, upload a file using a browser or curl (so it 'does a 
multi-part upload' you'll get the contents in their raw multi-part encoded 
format).  It treats the body of the request (the stuff you POST) as opaque and
just flat saves it as is.  The goal is to save the data, and anything that isn't
that is not done as it can only add potential problems.
