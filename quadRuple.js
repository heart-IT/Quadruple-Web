/**
 * Preferring simplicity and freedom, Practicing not-doing, Everything will fall into place - Lao Tzu
 */

(function() {
  "use strict";
  // private variables
  var superState = {
    publisherID: 1, //id of the publisher
    spaceID: "quad_units", //div id of the space
    startTime: null, //start time for ads
    userID: -1, //useriD of the session
    userIP: null,
    userIdle: false, //application just loaded, user must not be idle
    pathname: null, // window location pathname
    isRequestInProcess: false,
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
  getAds(loadAds);

  /**
   * Function which gets Ads.
   * @param {Function} cb callback function
   */
  function getAds(cb) {
    if (getCookie("userID")) {
      superState.userID = getCookie("userID");
    } else {
      superState.userID = makeCrypticUserID(32);
      setCookie("userID", superState.userID, 99999);
    }
    if (getCookie("pageCounter")) {
      setCookie("pageCounter", parseInt(getCookie("pageCounter")) + 1);
      superState.pageCounter = getCookie("pageCounter");
    } else {
      setCookie("pageCounter", 1);
      superState.pageCounter = 1;
    }
    superState.pathname = window.location.pathname;
    superState.userIP = myip;
    var url = "https://www.quadrupletech.com/receiver/adinfo.php";
    var method = "POST";
    var params = {
      publisherID: superState.publisherID,
      spaceID: superState.spaceID,
      userID: superState.userID,
      pathname: superState.pathname,
      pageCounter: superState.pageCounter,
      userIP: superState.userIP
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
      // superState.quadState.quadVisibilityPercent = 0;
      cb();
    }
    function error() {}
  }

  function loadAds() {
    // element where quadruple ads will come. add Quadruple class to it for css. Create html for ads and add it to the div
    var el = document.getElementById(superState.spaceID);
    el.setAttribute("class", "Quadruple");
    el.appendChild(sliderHTML(superState.quadState.quadsList));

    var quadImages = document.getElementsByClassName("Quadruple-image");
    var noOfImagesLoaded = 0;
    for (var i = 0; i < quadImages.length; i++) {
      (function(i) {
        quadImages[i].onload = loadHandler(i);
        quadImages[i].onerror = errorHandler(i);
      })(i);
    }
    function loadHandler(i) {
      noOfImagesLoaded++;
      sendImageLoadURL(
        superState.quadState.quadsList[i].id,
        superState.quadState.quadsList[i].u_uid,
        true
      );
      if (noOfImagesLoaded === quadImages.length) {
        init(el);
      }
    }

    function errorHandler(i) {
      noOfImagesLoaded++;
      sendImageLoadURL(
        superState.quadState.quadsList[i].id,
        superState.quadState.quadsList[i].u_uid,
        false
      );
      if (noOfImagesLoaded === quadImages.length) {
        init(el);
      }
    }

    function sendImageLoadURL(quadID, quadUID, success) {
      var url = "https://www.quadrupletech.com/receiver/image-receiver.php";
      var method = "POST";
      var params = {
        publisherID: superState.publisherID,
        spaceID: superState.spaceID,
        userID: superState.userID,
        userIP: superState.userIP,
        pathname: superState.pathname,
        quadID: quadID,
        quadUID: quadUID,
        renderSuccess: success
      };
      var paramsToSend = JSON.stringify(params);
      sendHttpRequest(url, method, paramsToSend, success, error);
      function success() {}
      function error() {}
    }
  }

  function init(el) {
    superState.startTime = new Date();
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

      autoplay(superState.quadState.quadTimer, nextFunction);
      quadruple.on("change", adsChanged);
      function adsChanged(event) {
        superState.isRequestInProcess = false; //request in process reset
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
    if (superState.quadState.quadVisibilityPercent) {
      superState.quadState.isQuadVisible =
        elementVisibility(superState.spaceID) >
        superState.quadState.quadVisibilityPercent
          ? true
          : false;
    } else {
      superState.quadState.isQuadVisible = true;
    }
    window.addEventListener("scroll", function(e) {
      if (superState.quadState.quadVisibilityPercent) {
        if (superState.quadState) {
          superState.quadState.isQuadVisible =
            elementVisibility(superState.spaceID) >
            superState.quadState.quadVisibilityPercent
              ? true
              : false;
        } else {
          superState.quadState.isQuadVisible = true;
        }
      }
    });

    function sendActivity() {
      if (
        superState.quadState.isQuadVisible &&
        !superState.userIdle &&
        !superState.quadState.wasQuadSent
      ) {
        var url = "https://www.quadrupletech.com/receiver/data-receiver.php";
        var method = "POST";
        var params = {
          publisherID: superState.publisherID,
          spaceID: superState.spaceID,
          pathname: superState.pathname,
          pageCounter: superState.pageCounter,
          timeInSeconds: new Date() - superState.startTime,
          userID: superState.userID,
          userIP: superState.userIP,
          quadID:
            superState.quadState.quadsList[
              superState.quadState.currentVisibleQuadIndex
            ].id,
          quadUID:
            superState.quadState.quadsList[
              superState.quadState.currentVisibleQuadIndex
            ].u_uid,
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
        console.log(params);
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
      var url = "https://www.quadrupletech.com/receiver/click-receiver.php";
      var method = "POST";
      var params = {
        publisherID: superState.publisherID,
        spaceID: superState.spaceID,
        pathname: superState.pathname,
        pageCounter: superState.pageCounter,
        timeInSeconds: new Date() - superState.startTime,
        userID: superState.userID,
        userIP: superState.userIP,
        quadID:
          superState.quadState.quadsList[
            superState.quadState.currentVisibleQuadIndex
          ].id,
        quadUID:
          superState.quadState.quadsList[
            superState.quadState.currentVisibleQuadIndex
          ].u_uid,
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
    var random = 14;
    var possibilities =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$";
    text += new Date().getTime();
    var crytpicPID = superState.publisherID.toString();
    var diff = 5 - crytpicPID;
    if (diff > 0) {
      crytpicPID = Array(diff + 1).join("0") + crytpicPID;
    }
    text += crytpicPID;
    for (var i = 0; i < random; i++) {
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
      img.setAttribute("class", "Quadruple-image");
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
    setInterval(function() {
      callback();
    }, interval);
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
    if (superState.isRequestInProcess) {
      return;
    }
    superState.isRequestInProcess = true;
    var http = new XMLHttpRequest();
    http.open(method, url, true);
    http.setRequestHeader("Content-type", "application/json;charset=UTF-8");
    http.onreadystatechange = function() {
      if (http.readyState == 4 && http.status == 200) {
        success(http.responseText);
      } else {
        error();
      }
      superState.isRequestInProcess = false;
    };
    http.send(params);
  }

  function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
    var expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
  }

  function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(";");
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == " ") {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  }
})();
