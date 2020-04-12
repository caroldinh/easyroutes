var key = "[KEY]"
var start, end, speed, time, unit, highways, traffic, max, timeTaken, route1, route2, route3;

var platform;

function loadSite(){
  start = document.getElementById("start");
  end = document.getElementById("destination");
  speed = document.getElementById("maxSpeed");
  time = document.getElementById("time");
  unit = document.getElementById("unit");
  highways = document.getElementById("highways");
  traffic = document.getElementById("traffic");

  platform = new H.service.Platform({
    apikey: key
  });
  
}

function submit(){


  // Fill in default values if values were left blank
  if(speed.value == ""){
    speed.value = 30;
  }
  if(start.value==""){
    start.value = "7950 Baltimore Avenue, College Park, MD";
  }
  var selectedUnit = unit.options[unit.selectedIndex].value;
  if(selectedUnit == "mph"){
    max = speed.value * 1.609;
  } else{
    max = speed.value;
  }
  var hours = time.value;
  if(hours == "" || isNaN(hours)){ 
    hours = 1;
    time.value = 1;
  }

  var half = hours / 2;
  var totalDistance = half * max;
  var distLat = (totalDistance / 5) / 111;
  var distLong = distLat;

  // clear routes
  route1 = null; route2 = null; route3 = null;

  // Get coordinates of starting location
  var urlBase = "https://geocoder.ls.hereapi.com/6.2/geocode.json?searchtext="
  var url1 = urlBase + start.value + "&gen=9&apiKey=" + key;
  var coords1 = [];
  $.ajax({
    dataType: "json",
    url: url1,
    async:false,
    success: function(data){
      coords1[0] = data.Response.View[0].Result[0].Location.DisplayPosition.Latitude;
      coords1[1] = data.Response.View[0].Result[0].Location.DisplayPosition.Longitude;
      console.log("Coords 1: " + coords1);
    }
  });

  var coords2 = [], coords3 = [];
  if(destination.value == ""){ // If the user didn't specify a destination,
                               // Generate a random route
    // Randomize route
    var rand = Math.floor(Math.random() * 4);
    if(rand==0){
      distLat = -distLat;
    } else if(rand==1){
      distLong = -distLong;
    } else if (rand==2){
      distLat = -distLat;
      distLong = -distLong;
    }
    coords2 = [coords1[0]+distLat, coords1[1]-distLong];
    coords3 = [coords2[0]-distLat, coords2[1]-distLong];

  } else{   // Otherise, take them to their destination
    url2 = urlBase + end.value + "&gen=9&apiKey=" + key;
    $.ajax({
      dataType: "json",
      url: url2,
      async:false,
      success: function(data){
        coords2[0] = data.Response.View[0].Result[0].Location.DisplayPosition.Latitude;
        coords2[1] = data.Response.View[0].Result[0].Location.DisplayPosition.Longitude;
        console.log(coords2);
      }
    });
  }

  // Display error message if something goes wrong
  if(coords1[0] == null || coords1[1] == null || coords2[0] == null || coords2[1] == null){
    var directions = document.getElementById("directions");
    directions.innerHTML = "Error - one or more of your inputs is invalid";
    window.location = '#route';
  }

  // Account for values in checkboxes
  var extras = "";
  if(traffic.checked){
    extras += ";traffic:enabled";
  } else{
    extras += ";traffic:disabled";
  }
  if(highways.checked){
    extras += ";motorway:-3";
  }

  var directions = document.getElementById("directions");
  directions.innerHTML = "";
  timeTaken = 0;

  // URL to route
  var url3 = "https://route.ls.hereapi.com/routing/7.2/calculateroute.json?apiKey=" + key + "&waypoint0=geo!" + coords1[0] + "," + coords1[1] + "&waypoint1=geo!" + coords2[0] + "," + coords2[1] + "&legattributes=li&mode=fastest;car" + extras;
  console.log(url3);

  if(destination.value == ""){

    // Generate route
    var url4 = "https://route.ls.hereapi.com/routing/7.2/calculateroute.json?apiKey=" + key + "&waypoint0=geo!" + coords2[0] + "," + coords2[1] + "&waypoint1=geo!" + coords3[0] + "," + coords3[1] + "&legattributes=li&mode=fastest;car" + extras;
    var url5 = "https://route.ls.hereapi.com/routing/7.2/calculateroute.json?apiKey=" + key + "&waypoint0=geo!" + coords3[0] + "," + coords3[1] + "&waypoint1=geo!" + coords1[0] + "," + coords1[1] + "&legattributes=li&mode=fastest;car" + extras;
    getRoute(url3, selectedUnit, hours);
    getRoute(url4, selectedUnit, hours);
    getRoute(url5, selectedUnit, hours);
  } else{

    // Get route from start to destination
    getRoute(url3, selectedUnit, hours);
  }

  var estimatedTime = document.createElement("p");
  estimatedTime.innerHTML = "<b>Estimated time: " + timeTaken + " hours</b>";
  directions.appendChild(estimatedTime);

  var defaultLayers = platform.createDefaultLayers();
  var mapDiv = document.getElementById('map');
  mapDiv.style.height = "40vw";
  mapDiv.innerHTML = "";

  //Step 2: initialize a map - this map is centered over Europe
  var map = new H.Map(mapDiv,
    defaultLayers.vector.normal.map,{
    center: {lat:50, lng:5},
    zoom: 4,
    pixelRatio: window.devicePixelRatio || 1
  });
  // add a resize listener to make sure that the map occupies the whole container
  window.addEventListener('resize', () => map.getViewPort().resize());

  //Step 3: make the map interactive
  // MapEvents enables the event system
  // Behavior implements default interactions for pan/zoom (also on mobile touch environments)
  var behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

  // Create the default UI components
  var ui = H.ui.UI.createDefault(map, defaultLayers);

  moveMap(map, coords1);

  var mapContent = [];

  // Draw a marker for the starting position
  var startMarker = new H.map.Marker({
    lat: coords1[0],
    lng: coords1[1]
  });
  mapContent.push(startMarker);
  var routeShape;

  if(destination.value!=""){
    // Draw a marker for the end position (if applicable)
    routeShape = route1.shape;
    var endMarker = new H.map.Marker({
      lat: coords2[0],
      lng: coords2[1]
    });
    mapContent.push(endMarker);
  } else{
    // Merge all three routes into one (if applicable)
    routeShape1 = route1.shape;
    routeShape2 = route2.shape;
    //console.log("Route2 Shape: " + route2.shape);
    routeShape3 = route3.shape;
    //console.log("Route3 Shape: " + route3.shape);
    routeShape = routeShape1.concat(routeShape2.concat(routeShape3));
  }
  linestring = new H.geo.LineString();
    //console.log("Route1 Shape: " + routeShape);
    routeShape.forEach(function(point) {
      var parts = point.split(',');
      linestring.pushLatLngAlt(parts[0], parts[1]);
    });
    var routeLine = new H.map.Polyline(linestring, {
      style: { strokeColor: 'blue', lineWidth: 3 }
    });

    mapContent.push(routeLine);

    map.addObjects(mapContent);
    // Set the map's viewport to make the whole route visible:
    map.getViewModel().setLookAtData({bounds: routeLine.getBoundingBox()});
  
}

function moveMap(map, coords1){
  map.setCenter({lat:coords1[0], lng:coords1[1]});
  map.setZoom(14);
}

function getRoute(url, selectedUnit, hours){

  getRouteShape(url + "&representation=display");

  $.ajax({
    dataType: "json",
    url: url,
    async:false,
    success: function(data){
      console.log(data);
      var directions = document.getElementById("directions");
      var instructions = data.response.route[0].leg[0].maneuver;
      var speedLimits = data.response.route[0].leg[0].link;
      var time = Math.round(data.response.route[0].summary.trafficTime / 360) / 10;
      timeTaken += time;
      var slower = true;

      // Determine if route is under max speed
      for(var i = 0; i < speedLimits.length; i++){
        if(speedLimits[i].speedLimit > (1.3 * speed.value)){
          slower = false;
        }
      }
      if(slower){

        // Display instructions
        for(var i = 0; i < instructions.length; i++){
          var box = document.createElement("div");
          box.className = "instrucBox";
          var content = document.createElement("p");
          content.className="direction";
          content.innerHTML = instructions[i].instruction

          // Convert to imperial units if user specified mph
          if(selectedUnit == "mph"){
            var descrip = content.getElementsByClassName("distance-description")[0];
            var length = descrip.getElementsByClassName("length")[0];
            var lengthValue = length.innerHTML;
            lengthValue = lengthValue.split(" ");
            if(lengthValue[1] == "km"){
              length.innerHTML = Math.round((lengthValue[0]*10 / 1.609))/10 + " mi";
            } else if(lengthValue[1] == "m"){
              length.innerHTML = Math.round((lengthValue[0]/10 * 3.281))*10 + " ft";
            }
          }
          box.appendChild(content);
          directions.appendChild(box);
          window.location = '#route';
        }
      } else{
        var directions = document.getElementById("directions");

        // Redo the entire search but exclude highways
        if(!highways.checked){
          highways.checked="true";
          var extras = ";motorway:-3";
          url += extras;
          getRoute(url, selectedUnit, hours);

        }
        else{
          directions.innerHTML = "No route available with maximum speed " + speed.value + " " + selectedUnit + ", suggested route above";
          window.location = '#route';
        }

      }

    }
  });

}

function getRouteShape(url){
  $.ajax({
      dataType: "json",
      url: url,
      async:false,
      success: function(data){
        if(route1==null){
          route1 = data.response.route[0];
        } else if (route2==null){
          route2 = data.response.route[0];
        } else if (route3==null){
          route3 = data.response.route[0];
        }
      }
    });
}

function hidetime(){
  if(destination.value != ""){
    $( ".time" ).fadeOut();
  } else{
    $( ".time" ).fadeIn();
  }
}

function scrollUp(){
  window.location = '#top';
}
