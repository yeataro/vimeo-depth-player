//Import the vimeo.js library
const Vimeo = require('vimeo').Vimeo;

// Import the express library and create an express app
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const cors = require('cors')
const app = express();


// Render engine setup
var path = require('path');
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(expressLayouts);

//Setup cors
app.use(cors());

//Implement vimeo API version 3.4 header
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// If working locally load the enviorment variables which are inside the .env file
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').load();
  console.log('[Server] enviorment variables loaded from .env file 💪🏻');
}

/*
* Public Routes
* - /
* - /:video_id
*/

app.get('/', (request, response) => {
  console.log(`[Server] A ${request.method} request was made to ${request.url}`);
  response.sendFile(`${__dirname}/views/index.html`);
});

app.get('/:video_id', (request, response) => {
  // console.log(request.headers['user-agent']);
  console.log(`[Server] A ${request.method} request was made to ${request.url}`);
  response.render('video', { video_id: request.params.video_id });
});

// The route for getting videos from the vimeo API
app.get('/video/:id', (request, response) => {
  console.log(`[Server] A ${request.method} request was made to ${request.url}`);

  // Create an API instance using your key
  let api = new Vimeo(null, null, process.env.VIMEO_TOKEN);

  // Make a requet
  api.request({
    method: 'GET',
    path: `/videos/${request.params.id}`,
    headers: { 'Accept': 'application/vnd.vimeo.*+json;version=3.4' },
  }, 
  function(error, body, status_code, headers) {
    if (error) {
      response.status(500).send(error);
      console.log('[Server] ' + error);
    }
    else {
      if (body["play"] == null) {
        response.status(401).send({ error: "You don't have access to this video's files." });
        return;
      }

      if (body.live.status == "streaming") {
        var unfurl = require('unfurl-url');

        unfurl.url(body.play.dash.link, function(error, url) {
          dash_unfurled = true;
          if (!error) {
            body.play.dash.link = url;
          }

          RenderVideoFilesResponse(response, body);
        });

        unfurl.url(body.play.hls.link, function(error, url) {
          hls_unfurled = true;
          if (!error) {
            body.play.hls.link = url;
          }

          RenderVideoFilesResponse(response, body);
        });
      }
      else {
        response.status(200).send(body);
      }
    }
  });

});

var dash_unfurled = false;
var hls_unfurled = false;

function RenderVideoFilesResponse(response, json) {
  if (dash_unfurled && hls_unfurled) {
    response.status(200).send(json);
  }
}

const listener = app.listen(process.env.PORT, () => {
  console.log(`[Server] Running on port: ${listener.address().port} 🚢`);
});
