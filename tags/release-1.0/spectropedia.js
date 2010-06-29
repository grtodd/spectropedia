/**
 * spectropedia.js
 *
 */

/** - Add any missing pieces -------------------------------------------- */
// Some browsers really have no console at all
if (typeof(window.console) == "undefined") {  
  window.console = { debug   : function(){},
                     warning : function(){},
                     error   : function(){},
                     log     : function(){}  };
  console = window.console;
}

// And some Javascript implementations don't have native JSON
if (typeof(JSON) == "undefined") {           
  console.log("No native support for JSON. Falling back to jquery.json");    
  load("ext/jquery.json.js");
  JSON = {
    stringify : $.toJSON,
    parse     : $.secureEvalJSON
  };
}



/** - Math Utilities ---------------------------------------------------- */
Math.logb = function(x, base) { 
  return Math.log(x) / Math.log(base); 
};



/** - Text Utilities ---------------------------------------------------- */
function _pretty_hertz(hertz) {
  hertz = parseInt(hertz);
  var onetera = Math.pow(1000, 4);
  var onegiga = Math.pow(1000, 3);
  var onemega = Math.pow(1000, 2);
  var onekilo = Math.pow(1000, 1);
  if (hertz > onetera) {
    return { value : (hertz / onetera).toFixed(2), unit : "THz" };
  } else if (hertz > onegiga) {
    return { value : (hertz / onegiga).toFixed(2), unit : "GHz" };
  } else if (hertz > onemega) {
    return { value : (hertz / onemega).toFixed(2), unit : "MHz" };
  } else if (hertz > onekilo) {
    return { value : (hertz / onekilo).toFixed(2), unit : "KHz" };
  }
  return { value : hertz, unit : "Hz" };
};

function pretty_hertz(hertz) {
  var ret = _pretty_hertz(hertz);
  return ret.value + " " + ret.unit;
};

function pretty_hertz_range(range) {
  var begin = _pretty_hertz(range.begin);
  var end   = _pretty_hertz(range.end);
  if (begin.unit == end.unit) {
    return begin.value + "-" + end.value + " " + end.unit;
  }
  return begin.value + " " + begin.unit + " - " + end.value + " " + end.unit;        
};

function pretty_frequency(frequency) {
  if (frequency.uplink && frequency.downlink) {
    return pretty_hertz_range(frequency.downlink) + " // " + pretty_hertz_range(frequency.uplink);
  } 
  return pretty_hertz_range(frequency);
}



/** Graphics Utilities -------------------------------------------------- */

var backgrounds_pencil = [ "style/crosshatch.jpg" ]; 
var backgrounds_blue = [ "style/crosshatch-blue.jpg" ];
var backgrounds_red = [ "style/crosshatch-red.jpg"  ];

//var backgrounds_pencil = [ "3/1.jpg", "3/5.jpg", "3/7.jpg" ];
//var backgrounds_blue = [ "3/1-green.jpg", "3/5-green.jpg", "3/7-green.jpg" ];
//var backgrounds_red = [ "3/1-red.jpg", "3/5-red.jpg", "3/7-red.jpg" ];

function indexed_color(colors, index) {
  return colors[index % colors.length];
};

/** 
 * given frequency as x, return pixel position as y from log scale 
 */
function hz_to_px(hz, element) {
  // given frequency as x, return pixel position as y from log scale
  var FREQ_max = 10.0 * Math.pow(10, 9);  /* 10 GHz */
  var s_width = $(element)[0].scrollWidth;
  return s_width * (Math.logb(hz / 300.0, 10) / Math.logb(FREQ_max, 10));
};




/** - Misc Utilities ---------------------------------------------------- */

/**
 * Given a list of allocations, identify secondary&tertiary allocations
 */
function rank_allocations(allocations) {
  var bands = [];
  function rank_allocation(bands, frequency) {
    var rank = 1;
    for (var band in bands) {
      band = bands[band];
      var begin = band.begin;
      var end   = band.end;
      if ((frequency.begin > begin && frequency.begin < end) ||
          (frequency.end   >  begin && frequency.end   < end)) {
        rank += 1; // band.rank
      }
    }
    return rank;
  }
  for (var allocation in allocations) {
    allocation = allocations[allocation];
    if (allocation.frequency.uplink && allocation.frequency.downlink) {
      allocation.rank = Math.max(rank_allocation(bands, allocation.frequency.uplink),
                                 rank_allocation(bands, allocation.frequency.downlink));
      bands.push(allocation.frequency.uplink);
      bands.push(allocation.frequency.downlink);
    } else {
      allocation.rank = rank_allocation(bands, allocation.frequency);
      bands.push(allocation.frequency);
    }
    //console.log(allocation.name + " ranked: " + allocation.rank);
  }
  return allocations;
};



/** - Element Creation -------------------------------------------------- */

/**
 *
 */
function range(id, intervals, interval_width, f_labels) {
  var parent = $("#" + id);
  var scale = "";
  var range_width = 0;
  for (var i = 1; i <= intervals; i++) {
    range_width += interval_width;
    scale += "<span class='scale' style='width: " + (interval_width-1) + "px;'>";
    scale += "<span class='label' style='width: " + interval_width + "px;'>" + pretty_hertz(f_labels(i)) + "</span>";
    scale += "</span>";
  }
  parent.append("<div id='"   + id + "-container'>" + 
                "<div style='width:" + range_width + "px;' id='" + id + "-scale'>" + scale + "</div>" +
                "<div style='height: inherit; position: absolute; top: 0px; left: 0px;'>" +
                "<div style='width:" + range_width + "px;' id='" + id + "-assignments'></span>" +
                "</div>" +
                "<div style='height: inherit; position: absolute; top: 0px; left: 0px;'>" +
                "<div style='width:" + range_width + "px;' id='" + id + "-allocations'></div>" +
                "</div>" +
                "</div>");
};


/** 
 *
 */
function add_allocation(parent, allocation, index, size) {
  var element = $(document.createElement("div"));
  element.addClass("allocation");
  var title = (allocation.label ? allocation.name + allocation.label : allocation.name);
  var frequency = allocation.frequency;
  var left  = hz_to_px(frequency.begin, parent + "-container");
  var right = hz_to_px(frequency.end,   parent + "-container");
  element.css({
      left       : left,
        width      : right - left,
        height     : String(size * 100) + "%"
        });
  element.hover(function() {
      var html = "<div class='title'>" + title + "</div>";
      html += "<div class='frequency'>";
      html += "&nbsp;&nbsp;" + pretty_frequency(frequency) + ",&nbsp;";
      //html += Math.min(100, Math.floor(allocation.availability.bandwidth / allocation.frequency.bandwidth * 100.0)) + "% assigned";
      html += Math.floor(allocation.availability.bandwidth / allocation.frequency.bandwidth * 100.0) + "% assigned";
      html += "</div>";
      html += "<div class='notes'><b>Availability:</b>" + allocation.availability.description + "</div>";
      $("#details-control").html(html);
    });
  if (allocation.background) { element.css("background", allocation.background); }
  if (allocation.color)      { element.css("color",      allocation.color);      }
  $(parent + "-allocations").append(element);
  
  /* Color coding for availability
       If the "Availability" field starts with "No" I assume 100% capacity and I color all red.
       If the "Availability" field starts with "Yes" and capacity > 100% I color all green.
       If the "Availability" field starts with "Yes" and capacity < 100% I color red proportionally. */
  if (parent === "#overview") {
    var percent = Math.floor(allocation.availability.bandwidth / allocation.frequency.bandwidth * 100.0);
    var available = allocation.availability.description;
    if (available.indexOf("Yes") === 0 && percent > 100.0) percent = 0.0;
    else if (available.indexOf("No") === 0) percent = 100.0;
    var availability = $(document.createElement("div"));
    availability.addClass("availability");
    availability.css("height", 100 - percent + "%");
    element.append(availability);
  } else {
    element.css("background-image", "url(style/crosshatch.jpg)");
  }


  if (parent === "#detail") {
    // set a label
    var label = $(document.createElement("div"));
    label.addClass("label");
    //label.css({ width : element.height() + "px" });
    var html = "&nbsp;&nbsp;" + title + "&nbsp;";
    label.html(html);
    element.append(label);
    
    // add assignments
    var assignments = $(document.createElement("div"));
    var is_channel = false;
    //element.append("<br/>");
    for (var index in allocation.assignments) {
      var assignment = allocation.assignments[index];
      if (assignment.frequency && assignment.frequency.uplink && assignment.frequency.downlink) {
        var frequency = assignment.frequency;
        assignment.label = "(uplink)";
        assignment.frequency = frequency.uplink;
        add_assignment_frequency($("#detail-assignments"), assignment, index);
        assignment.label = "(downlink)";
        assignment.frequency = frequency.downlink;
        add_assignment_frequency($("#detail-assignments"), assignment, index);
        assignment.frequency = frequency;
      } else if (assignment.frequency) {
        add_assignment_frequency($("#detail-assignments"), assignment, index);
      } else { 
        //add_assignment_channel(element, assignment, index);
        add_assignment_channel(assignments, assignment, index);
        is_channel = true;
      }
    }
    if (!is_channel) return;

    assignments.css("position", "absolute");
    assignments.css("bottom", "0px");
    assignments.css("width", element.width());
    assignments.css("padding-bottom", "0.5em");
    assignments.css("overflow", "hidden");
    //assignments.addClass("assignments");
    //assignments.css("width", (element.height()) + "px");
    element.append(assignments);
  }

};



/**
 *
 */
function add_assignment_frequency(parent, assignment, index) { 
  var element = $(document.createElement("div"));
  element.addClass("assignment-frequency");
  var frequency = assignment.frequency;
  var left  = hz_to_px(frequency.begin, "#detail-container");
  var right = hz_to_px(frequency.end,   "#detail-container");
  element.css({
      left   : left,
      height : right - left,
      width  : (parent.height()/1.6) + "px",
    });
  element.css("background-image", "url(style/crosshatch-green.jpg)");
  if ((right-left) > 20) {
    var html = (assignment.label ? "<b>" + assignment.licensee + "</b> <i>" + assignment.label + "</i>" : "<b>" + assignment.licensee + "</b>");
    element.html("&nbsp;" + html);
  } 
  element.hover(function() {
      var html = "<div class='title'>" + assignment.licensee + "</div>&nbsp;";
      html += "<div class='frequency'>" + pretty_frequency(assignment.frequency) + ",&nbsp;";
      //html += pretty_hertz(assignment.availability.bandwidth) + " ch. b/width";
      html += assignment.availability.channels + " channels";
      html += "</div>";
      html += "<div class='notes'>" + assignment.comment + "</div>";
      $("#details-control").html(html);
    });
  parent.append(element);
};



/**
 *
 */
function add_assignment_channel(parent, assignment, index) {
  var element = $(document.createElement("div"));
  element.addClass("assignment-channel");
  element.html("<b>" + assignment.licensee + "</b>");
  element.css("background-image", "url(style/crosshatch-green.jpg)");
  element.hover(function() {
      var html = "<div class='title'>" + assignment.licensee + "</div>&nbsp;";
      html += "<div class='frequency'>";
      //html += pretty_hertz(assignment.availability.bandwidth) + " ch. b/width";
      html += assignment.availability.channels + " channels";
      html += "</div>";
      html += "<div class='notes'>" + assignment.comment + "</div>";
      $("#details-control").html(html);
    });
  parent.append(element);
};


/*
  if (assignment.image && parent === "#detail") {
    console.log(assignment.image);
    var image = $(document.createElement("span"));
    image.html("<img src='" + assignment.image.src + "'/>");
    element.addClass("assignment");
    image.css({
        position   : "absolute",
          left       : left + Math.abs(assignment.image.offset),
          width      : right - left,
          bottom     : bottom + assignment.image.offset
          });
    $(parent + "-assignments").append(image);
  }
*/