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
    superState.userID = makeCrypticUserID(8);

    // element where quadruple ads will come. add Quadruple class to it for css. Create html for ads and add it to the div
    var el = document.getElementById(superState.spaceID);
    el.setAttribute("class", "Quadruple");
    el.appendChild(sliderHTML(superState.quadState.quadsList));
    var btn = document.createElement("button");
    btn.setAttribute("class", "Quadruple-buttonPrevious");
    btn.innerHTML = "Previous";
    el.appendChild(btn);
    var btn2 = document.createElement("button");
    btn2.setAttribute("class", "Quadruple-buttonNext");
    btn2.innerHTML = "Next";
    el.appendChild(btn2);
    // initialize quadruple slider. change ad every timerCountdown seconds. Check for analytics on change.
    (function() {
      var quadruple = new Quadruple(el);
      autoplay(superState.quadState.quadTimer, nextFunction);
      quadruple.on("change", adsChanged);

      function nextFunction() {
        quadruple.next();
      }

      function adsChanged(event) {
        if (event.detail.currentItemIndex === 0) {
          superState.quadState.currentQuadsIteration++;
        }
        superState.quadState.wasQuadSent = false;
        superState.quadState.currentVisibleQuadIndex =
          event.detail.currentItemIndex;
        sendActivity();
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
        success();
      } else {
        error();
      }
    };
    http.send(params);
  }
})();
