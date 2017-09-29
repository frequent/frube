/*jslint nomen: true, indent: 2, maxlen: 80 */
/*global window, rJS, RSVP */
(function (window, rJS, RSVP) {
  "use strict";

  /////////////////////////////
  // parameters
  /////////////////////////////
  var REQUEST_TIMEOUT = 24000;

  /////////////////////////////
  // methods
  /////////////////////////////
  function getUrlParameter(name, url) {
    return decodeURIComponent(
      (new RegExp("[?|&]" + name + "=" + "([^&;]+?)(&|#|;|$)")
        .exec(url)||[, ""])[1].replace(/\+/g, "%20")) || null;
  }

  function uuid() {
    function S4() {
      return ("0000" + Math.floor(
        Math.random() * 0x10000
      ).toString(16)).slice(-4);
    }
    return S4() + S4() + "-" +
      S4() + "-" +
      S4() + "-" +
      S4() + "-" +
      S4() + S4() + S4();
  }

  function setState() {
    var state = uuid();
    window.sessionStorage.setItem("state", state);
    return state;
  }

  function getState() {
    return window.sessionStorage.getItem("state");
  }

  rJS(window)

    /////////////////////////////
    // ready
    /////////////////////////////
    .ready(function () {
      return this.initializeDropbox();
    })

    /////////////////////////////
    // declared methods
    /////////////////////////////
    .declareMethod("getDropbox", function (my_url, my_name, my_config) {
      var popup;
      var popup_resolver;
      var resolver = new Promise(function (resolve, reject) {
        popup_resolver = function resolver(href) {
          var test = getUrlParameter("state", href);

          // already logged in
          if (test && getState() === test) {
            window.sessionStorage.setItem("state", null);
            resolve({
              "access_token": getUrlParameter("access_token", href),
              "uid": getUrlParameter("uid", href),
              "type": getUrlParameter("token_type", href)
            });
          } else {
            reject("forbidden");
          }
        };

        popup = window.open(my_url, my_name, my_config);
        popup.opener.popup_resolver = popup_resolver;
        return window.promiseEventListener(popup, "load", true);
      });

      //return resolver;
      return new RSVP.Queue()
        .push(function () {
          return RSVP.any([
            resolver,
            RSVP.delay(REQUEST_TIMEOUT)
          ]);
        })
        .push(function (my_ouath_dict) {
          popup.close();
          if (my_ouath_dict) {
            return my_ouath_dict;
          }
          throw {"code": 408};
        });
    })

    .declareMethod("setDropbox", function (my_client_id) {
      return this.getDropbox(
        "https://www.dropbox.com/oauth2/authorize?" +
          "client_id=" + my_client_id +
          "&response_type=token" +
          "&state=" + setState() +
          "&redirect_uri=" + window.location.href,
        "",
        "width=480,height=480,resizable=yes,scrollbars=yes,status=yes"
      );
    })

    .declareMethod("initializeDropbox", function () {

      // the oauth popup will open same page and we will end up at this line, too,
      // but when inside the popup, the opener must be set
      if (window.opener === null) {
        return;
      }
      
      // window.opener returns reference to  window that opened this window
      // https://developer.mozilla.org/en-US/docs/Web/API/Window/opener
      // this passes the token to the promise waiting above

      // NOTE: if auth fails, dropbox overloads the page, we never reach this
      return window.opener.popup_resolver(
        window.location.hash.replace("#", "?")
      );
    });

}(window, rJS, RSVP));
