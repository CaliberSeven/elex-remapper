import { getColor } from "./color.js";

var viewingState = null;

var nationalBounds = [
  [25.887, -125.318],
  [49.249, -65.877]
]
var currentBounds = nationalBounds;

var mymap;
var countiesData, stateData;

var countiesLayer;
var stateName;

var alteredMargins = {};

var currentStateCounties;

main()

function main() {
  $.when(
    $.getJSON("./US_Counties.geojson", function(data) {
      countiesData = data
    }),
    $.getJSON("./US_States.json", function(data) {
      stateData = data
    })
  ).then(function() {
    let config = {
      minZoom: 4,
      maxZoom: 14,
      zoomSnap: 0.001,
    }
    mymap = L.map('map', config).setView([37.8, -96], 5);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(mymap);

    showNationalMap();

    window.onresize = function() {
      mymap.fitBounds(currentBounds, {padding: [100, 100]});
    }
  })
}

function showNationalMap(){
  viewingState = null;
  currentBounds = nationalBounds;
  currentStateCounties = countiesData.features;

  countiesLayer = getCountiesLayer(countiesData.features);
  mymap.addLayer(countiesLayer)
  let stateLayer = getStatesLayer(stateData);
  mymap.addLayer(stateLayer)

  mymap.fitBounds(nationalBounds, {padding: [100, 100]});
}

function getCountiesLayer(countiesFeatures, stateName = null){
  let countiesData = {
      features: countiesFeatures,
      type: "FeatureCollection"
  }
  return L.geoJSON(countiesData, {                
      style: function(feature){
          return {fillOpacity: 1, weight: .4, color: 'white', fillColor: getFeatureColor(feature)}
      }
  });
}

function getFeatureColor(feature){
  let newMargin = getMargin(feature);
  return getColor(newMargin);
}

function getMargin(feature){
  let alter = alteredMargins[feature.properties.OBJECTID];
  return (alter && alter.margin) ? newMargin.margin / 100 : get2020Margin(feature);
}

function get2020Margin(feature){
  let dem = feature.properties.BIDEN;
  let gop = feature.properties.TRUMP;
  let total = dem + gop;

  return (!total) ? 0 : (dem - gop) / total;
}

function getTurnout(feature) {
  let alter = alteredMargins[feature.properties.OBJECTID];
  return (alter && alter.turnout) ? alter.turnout : 0;
}

function getStatesLayer(statedata){
  return L.geoJSON(statedata, {
    style: {fillOpacity: 0, color: 'black'},
    onEachFeature(feature, layer) {
      layer.on('click', function(){
        stateName = this.feature.properties.ABBR;
        showState(stateName)
      })
      layer.on('mouseover', function () {
        this.setStyle({
          "fillOpacity": .1,
          'weight': 4
        });
      });
      layer.on('mouseout', function () {
        this.setStyle({
          "fillOpacity": 0,
          'weight': 2.5
        });
      });
    }
  });
}

function leanToString(val) {
  return `${val < 0 ? 'R' : 'D'} + ${Math.abs(val.toFixed(2))}`
}

function marginSlider(feature){
  let value = getMargin(feature) * 100;
  let str = leanToString(value);

  return `
    <form>
      <div id="voteCount${feature.properties.OBJECTID}">
        ${voteTable(feature)}
      </div>
      <div class="marginSlider">
        <input id="countyMarginEnter${feature.properties.OBJECTID}" style={display: "inline"}  value="${str}"></input>
        <input id="countyMarginSlider${feature.properties.OBJECTID}" style={display: "inline"} 
          min=-100 max=100 value=${value} step=".01" type="range"></input>
      </div>
    </form>
    `
}

function turnoutSlider(feature){
  return `
    <div class="turnoutSlider">
      <input id="countyTurnoutSlider${feature.properties.OBJECTID}" style={display: "inline"} 
        min=-1 max=1 value=${getTurnout(feature)} step=".01" type="range"></input>
    </div>
    `
}

function getVoteCount(features, actual = false){
  if(!Array.isArray(features))
      features = [features];
  let dem = 0, gop = 0;
  for(var i = 0; i < features.length; i++){
      let feature = features[i];
      let turnout = 1 + getTurnout(feature);
      let altered = alteredMargins[feature.properties.OBJECTID];
      if(actual){
          dem +=  feature.properties.BIDEN;
          gop +=  feature.properties.TRUMP;
      }
      else if(altered == null || altered.margin == null){
          dem += Math.round(turnout * feature.properties.BIDEN);
          gop += Math.round(turnout * feature.properties.TRUMP);
      }
      else{
          let margin = altered.margin / 100;
          let total = Math.round(turnout * (feature.properties.BIDEN + feature.properties.TRUMP))
          let demTotal =  Math.round((margin + 1) * total / 2)

          dem += demTotal;
          gop +=  total - demTotal;
      }
  }
  return {
      dem: dem,
      gop: gop
  }
}


function voteTable(features){
  if(!Array.isArray(features)){
      features = [features]
  }
  let voteCount = getVoteCount(features);
  let realResults = getVoteCount(features, true)
  let total = voteCount.dem + voteCount.gop;
  let margin = voteCount.dem - voteCount.gop;
  let realTotal = realResults.dem + realResults.gop
  let realMargin = realResults.dem - realResults.gop;

  return `
  <div style="font-size: 18px; width: 250px;">
  <div><b>2020 Results</b></div>
  <div>DEM: ${realResults.dem} (${(realTotal == 0 ? 0 : 100 * realResults.dem / realTotal).toFixed(2)}%)</div>
  <div>GOP: ${realResults.gop} (${(realTotal == 0 ? 0 : 100 * realResults.gop / realTotal).toFixed(2)}%)</div>
  <div>Margin: ${realMargin >= 0 ? 'D' : 'R'} +${Math.abs(realMargin)} (${Math.abs( realTotal == 0 ? 0 :  100 * realMargin / realTotal).toFixed(2)}%)</div>
  <div><b >Your Results</b></div>
  <div>DEM: ${voteCount.dem} (${(total == 0 ? 0 : 100 * voteCount.dem / total).toFixed(2)}%)</div>
  <div>GOP: ${voteCount.gop} (${(total == 0 ? 0 : 100 * voteCount.gop / total).toFixed(2)}%)</div>
  <span>Margin: ${margin >= 0 ? 'D' : 'R'} + ${Math.abs(margin)} (${Math.abs(total == 0 ? 0 : 100 * margin / total).toFixed(2)}%)</span>
  </div>
  `
}

function showState(stateName){
  viewingState = stateName;
  currentStateCounties = countiesData.features.filter(function(feature){
      return feature.properties.ABBR == stateName
  });
  countiesLayer = getCountiesLayer(currentStateCounties, stateName)
  mymap.addLayer(countiesLayer);
  currentBounds = countiesLayer.getBounds()
  mymap.fitBounds(currentBounds, { padding: [100, 100] });
}