/**
 * Preferring simplicity and freedom, Practicing not-doing, Everything will fall into place - Lao Tzu
 */

(function() {
  "use strict";
  // private variables
  var superState = {
    publisherID: 1, //id of the publisher
    spaceID: "ads_coming_here", //div id of the space
    startTime: null, //start time for ads
    userID: -1, //useriD of the session
    userIP: null,
    userIdle: false, //application just loaded, user must not be idle
    pathname: null, // window location pathname
    quadState: {
      quadsList: [],
      quadTimer: 0,
      userInactivityTimer: 0,
      quadVisibilityPercent: 20,
      sentQuadIDs: [], //list of quads sent that is were unique
      isQuadVisible: null, //ads didnt loaded yet
      currentVisibleQuadIndex: -1, // quad position
      currentQuadsIteration: 0, // current iteration of all quads
      wasQuadSent: false // was quad data was send in same iteration
    }
  };
  getAds(init);

  /**
   * Function which gets Ads.
   * @param {Function} cb callback function
   */
  function getAds(cb) {
    var url = "http://52.32.74.125/dashboard-htc/adinfo.php";
    var method = "POST";
    var params = {
      publisherID: superState.publisherID,
      spaceID: superState.spaceID
    };
    var paramsToSend = JSON.stringify(params);
    sendHttpRequest(url, method, paramsToSend, success, error);
    function success(quadsDataStringified) {
      var quadData = JSON.parse(quadsDataStringified);
      var adsList = quadData["ad_data"];
      var adTimer = quadData["ad_change_time"]
        ? Number(quadData["ad_change_time"])
        : 5000;
      var userInactivityTimer = quadData["user_inactivity"]
        ? Number(quadData["user_inactivity"])
        : 1000;
      var adVisibilityPercent = quadData["visibility"]
        ? Number(quadData["visibility"])
        : 20;
      superState.quadState.quadsList = adsList;
      superState.quadState.quadTimer = adTimer;
      superState.quadState.userInactivityTimer = userInactivityTimer;

      superState.quadState.quadVisibilityPercent = adVisibilityPercent;
      cb();
    }
    function error() {}
  }

  function init() {
    superState.startTime = new Date();
    superState.pathname = window.location.pathname;
    superState.userIP = myip;
    if (sessionStorage && sessionStorage.getItem("userID")) {
      superState.userID = sessionStorage.getItem("userID");
    } else {
      superState.userID = makeCrypticUserID(8);
      sessionStorage.setItem("userID", superState.userID);
    }

    // element where quadruple ads will come. add Quadruple class to it for css. Create html for ads and add it to the div
    var el = document.getElementById(superState.spaceID);
    el.setAttribute("class", "Quadruple");
    el.appendChild(sliderHTML(superState.quadState.quadsList));

    // bind click event
    (function() {
      var hrefs = document.getElementsByClassName("Quadruple-link");
      for (var i = 0; i < hrefs.length; i++) {
        hrefs[i].addEventListener("click", function(e) {
          sendClick(e);
        });
      }
    })();

    // initialize quadruple slider. change ad every timerCountdown seconds. Check for analytics on change.
    (function() {
      var quadruple = new Quadruple(el);
      quadruple.on("change", adsChanged);
      autoplay(superState.quadState.quadTimer, nextFunction);
      function adsChanged(event) {
        if (event.detail.currentItemIndex === 0) {
          superState.quadState.currentQuadsIteration++;
        }
        superState.quadState.wasQuadSent = false;
        superState.quadState.currentVisibleQuadIndex =
          event.detail.currentItemIndex;
        sendActivity();
      }
      function nextFunction() {
        quadruple.next();
      }
    })();

    // Check for user Idleness
    (function() {
      var awayCallback = function() {
        superState.userIdle = true;
      };
      var awayBackCallback = function() {
        superState.userIdle = false;
        sendActivity();
      };
      var hiddenCallback = function() {
        superState.userIdle = true;
      };
      var visibleCallback = function() {
        superState.userIdle = false;
        sendActivity();
      };

      var idle = new Idle({
        onHidden: hiddenCallback,
        onVisible: visibleCallback,
        onAway: awayCallback,
        onAwayBack: awayBackCallback,
        awayTimeout: superState.quadState.userInactivityTimer //away with default value of the textbox
      });
    })();

    // check for user scroll event.
    superState.quadState.isQuadVisible =
      elementVisibility(superState.spaceID) >
      superState.quadState.quadVisibilityPercent
        ? true
        : false;
    window.addEventListener("scroll", function(e) {
      if (superState.quadState) {
        superState.quadState.isQuadVisible =
          elementVisibility(superState.spaceID) >
          superState.quadState.quadVisibilityPercent
            ? true
            : false;
      }
    });

    function sendActivity() {
      if (
        superState.quadState.isQuadVisible &&
        !superState.userIdle &&
        !superState.quadState.wasQuadSent
      ) {
        var url = "http://52.32.74.125/dashboard-htc/data-receiver.php";
        var method = "POST";
        var params = {
          publisherID: superState.publisherID,
          spaceID: superState.spaceID,
          pathname: superState.pathname,
          timeInSeconds: new Date() - superState.startTime,
          userID: superState.userID,
          userIP: superState.userIP,
          quadID:
            superState.quadState.quadsList[
              superState.quadState.currentVisibleQuadIndex
            ].id,
          quadPosition: superState.quadState.currentVisibleQuadIndex + 1,
          quadIteration: superState.quadState.currentQuadsIteration,
          isUnique:
            superState.quadState.sentQuadIDs.indexOf(
              superState.quadState.quadsList[
                superState.quadState.currentVisibleQuadIndex
              ].id
            ) === -1
              ? true
              : false
        };
        var paramsToSend = JSON.stringify(params);
        sendHttpRequest(url, method, paramsToSend, success, error);
        function success() {
          superState.quadState.wasQuadSent = true;
          if (
            superState.quadState.sentQuadIDs.indexOf(
              superState.quadState.quadsList[
                superState.quadState.currentVisibleQuadIndex
              ].id
            ) === -1
          ) {
            superState.quadState.sentQuadIDs.push(
              superState.quadState.quadsList[
                superState.quadState.currentVisibleQuadIndex
              ].id
            );
          }
        }
        function error() {}
      }
    }

    function sendClick(ev) {
      var url = "http://52.32.74.125/dashboard-htc/click-receiver.php";
      var method = "POST";
      var params = {
        publisherID: superState.publisherID,
        spaceID: superState.spaceID,
        pathname: superState.pathname,
        timeInSeconds: new Date() - superState.startTime,
        userID: superState.userID,
        userIP: superState.userIP,
        quadID:
          superState.quadState.quadsList[
            superState.quadState.currentVisibleQuadIndex
          ].id,
        quadPosition: superState.quadState.currentVisibleQuadIndex + 1,
        quadIteration: superState.quadState.currentQuadsIteration
      };
      var paramsToSend = JSON.stringify(params);
      sendHttpRequest(url, method, paramsToSend, success, error);
      function success() {}
      function error() {}
    }
  }
  /**
   * Function to make cryptic user_id
   * @param {Number} length Length of string
   */
  function makeCrypticUserID(length) {
    var text = "";
    var possibilities =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$";
    for (var i = 0; i < length; i++) {
      text += possibilities.charAt(
        Math.floor(Math.random() * possibilities.length)
      );
    }
    return text;
  }

  /**
   * Function which convert list of ads into html code.
   * @param {Array} adsList List of ads
   */
  function sliderHTML(adsList) {
    return makeUL(adsList);
    function makeUL(array) {
      var list = document.createElement("div");
      list.setAttribute("class", "Quadruple-list");
      for (var i = 0; i < array.length; i++) {
        var item = document.createElement("div");
        item.setAttribute("class", "Quadruple-item");
        var link = document.createElement("a");
        link.title = "Quad unit";
        link.href = array[i].url;
        link.target = "_blank";
        link.setAttribute("class", "Quadruple-link");
        link.appendChild(makeImg(array[i].url));
        item.appendChild(link);
        list.appendChild(item);
      }
      return list;
    }
    function makeImg(src, alt, title) {
      var img = document.createElement("img");
      img.src = src;
      if (alt) img.alt = alt;
      if (title) img.title = title;
      return img;
    }
  }

  /**
   * 
   * @param {number} interval Interval of which autoplay event happens.
   * @param {function} code Code to run on interval
   */
  function autoplay(interval, callback) {
    var lastTime = 0;

    function frame(timestamp) {
      var update = timestamp - lastTime >= interval;

      if (update) {
        callback();
        lastTime = timestamp;
      }

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  /**
   * This function checks how much part of element is visible and return in %
   * @param {DOM} el Element of which visibility percent is to be check
   */
  function elementVisibility(el) {
    var windowDim = [
      window.pageYOffset,
      window.innerHeight + window.pageYOffset
    ];
    var el = document.getElementById(el);
    var elDim = [el.offsetTop, el.offsetTop + el.clientHeight];
    var visibleRange = [
      Math.max(windowDim[0], elDim[0]),
      Math.min(windowDim[1], elDim[1])
    ];
    var percent =
      (visibleRange[1] - visibleRange[0]) / (elDim[1] - elDim[0]) * 100;
    return percent;
  }

  /**
   * Function to send Http request
   * @param {string} url Url of the XML Request
   * @param {string} method 'GET/POST'
   * @param {string} params Params to send with Request
   * @param {function} success function to call on success
   * @param {function} error function to call on error
   */
  function sendHttpRequest(url, method, params, success, error) {
    var http = new XMLHttpRequest();
    http.open(method, url, true);
    http.setRequestHeader("Content-type", "application/json;charset=UTF-8");
    http.onreadystatechange = function() {
      if (http.readyState == 4 && http.status == 200) {
        success(http.responseText);
      } else {
        error();
      }
    };
    http.send(params);
  }
})();
