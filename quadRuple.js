/**
 * Preferring simplicity and freedom, Practicing not-doing, Everything will fall into place - Lao Tzu
 */

(function() {
  "use strict";
  var idle;

  var quadruple;

  // private variables

  var superState = {
    publisherID: 1, //id of the publisher
    spaceID: "ads_coming_here", //div id of the space
    startTime: null, //start time for ads
    userID: -1, //useriD of the session
    userIdle: false //application just loaded, user must not be idle
  };
  var quadState = {
    quadsList: [],
    quadTimer: 0,
    userInactivityTimer: 0,
    quadVisibilityPercent: 20,
    sentQuadIDs: [], //list of quads sent that is were unique
    isQuadVisible: null, //ads didnt loaded yet
    currentVisibleQuadIndex: -1, // quad position
    currentQuadsIteration: 0 // current iteration of all quads
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
    function success(response) {
      var adsList = [
        {
          id: 1,
          url: "http://52.25.120.1/images/1ad.jpg"
        },
        {
          id: 2,
          url: "http://52.25.120.1/images/2ad.png"
        },
        {
          id: 3,
          url: "http://52.25.120.1/images/3ad.jpg"
        },
        {
          id: 4,
          url: "http://52.25.120.1/images/4asd.jpg"
        }
      ];
      var adTimer = 5000;
      var userInactivityTimer = 1000;
      var adVisibilityPercent = 20;
      quadState.adsList = response.adsList ? response.adsList : adsList;
      quadState.adTimer = adTimer;
      quadState.userInactivityTimer = userInactivityTimer;
      quadState.adVisibilityPercent = adVisibilityPercent;
      cb();
    }
    function error() {}
  }

  function init() {
    superState.userID = makeCrypticUserID();

    // element where quadruple ads will come. add Quadruple class to it for css. Create html for ads and add it to the div
    var el = document.getElementById(superState.spaceID);
    el.setAttribute("class", "Quadruple");
    el.appendChild(sliderHTML(adsList));

    superState.startTime = new Date();

    // initialize quadruple slider. change ad every timerCountdown seconds. Check for analytics on change.
    (function() {
      quadruple = new Quadruple(el);
      autoplay(quadState.quadTimer, nextFunction);
      quadruple.on("change", adsChanged);

      function nextFunction() {
        quadruple.next();
      }

      function adsChanged(event) {
        if (event.detail.currentItemIndex === 0) {
          quadState.currentQuadsIteration++;
        }
        quadState.currentVisibleQuadIndex = event.detail.currentItemIndex;
        sendData();
      }
    })();

    // Check for user Idleness
    (function() {
      var awayCallback = function() {
        superState.userIdle = true;
      };
      var awayBackCallback = function() {
        superState.userIdle = false;
        sendData();
      };
      var hiddenCallback = function() {
        superState.userIdle = true;
      };
      var visibleCallback = function() {
        superState.userIdle = false;
        sendData();
      };

      var idle = new Idle({
        onHidden: hiddenCallback,
        onVisible: visibleCallback,
        onAway: awayCallback,
        onAwayBack: awayBackCallback,
        awayTimeout: quadState.userInactivityTimer //away with default value of the textbox
      });
    })();

    // check for user scroll event.
    window.addEventListener("scroll", function(e) {
      if (quadState) {
        quadState.isQuadVisible =
          adVisiblity() > quadVisibilityPercent ? true : false;
      }
    });
    quadState.isQuadVisible =
      adVisiblity() > quadVisibilityPercent ? true : false;
    function adVisiblity() {
      var windowDim = [
        window.pageYOffset,
        window.innerHeight + window.pageYOffset
      ];
      var el = document.getElementById(superState.spaceID);
      var elDim = [el.offsetTop, el.offsetTop + el.clientHeight];
      var visibleRange = [
        Math.max(windowDim[0], elDim[0]),
        Math.min(windowDim[1], elDim[1])
      ];
      var percent =
        (visibleRange[1] - visibleRange[0]) / (elDim[1] - elDim[0]) * 100;
      return percent;
    }
  }

  /**
   * Function to make cryptic user_id
   */
  function makeCrypticUserID() {
    var text = "";
    var possibilities =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$";
    var idLength = 8;
    for (var i = 0; i < idLength; i++) {
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
        item.appendChild(makeImg(array[i].url));
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

  function sendData() {
    if (
      superState.isAdVisible &&
      !superState.userIdle &&
      !superState.wasAdSent
    ) {
      var url = "http://52.32.74.125/dashboard-htc/data-receiver.php";
      var method = "POST";
      var params = Object.assign({}, superState, {
        timeInSeconds: new Date() - superState.startTime,
        currentIndex: -1,
        isUnique: superState.adsShown.indexOf(superState.adID) === -1 ? 1 : 0
      });
      // remove state configuration.. not wise to send extra data
      delete params.isAdVisible;
      delete params.userIdle;
      delete params.wasAdSent;
      delete params.startTime;
      delete params.adsShown;
      var paramsToSend = JSON.stringify(params);
      sendHttpRequest(url, method, paramsToSend, success, error);

      function success() {
        superState.wasAdSent = true;
        if (superState.adsShown.indexOf(superState.adID) === -1) {
          superState.adsShown.push(superState.adID);
        }
      }
      function error() {}
    }
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
        success();
      } else {
        error();
      }
    };
    http.send(params);
  }
})();
