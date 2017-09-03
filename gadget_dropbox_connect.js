/*jslint nomen: true, indent: 2 */
/*global window, rJS, RSVP */
(function (window, rJS, RSVP) {
  "use strict";

  /////////////////////////////
  // some methods
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
      return this.initializeDropboxConnection();
    })

    /////////////////////////////
    // declared methods
    /////////////////////////////
    .declareMethod("getDropboxConnect", function (my_url, my_name, my_config) {
      return new Promise(function (resolve, reject) {
        var popup_resolver = function resolver(href) {
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
            reject("forbidden - state parameter does not match.");
          }
        };

        return new RSVP.Queue()
          .push(function () {
            return window.open(my_url, my_name, my_config);
          })
          .push(function (my_opened_window) {
            my_opened_window.opener.popup_resolver = popup_resolver;
            return;
          });
      });
    })

    .declareMethod("setDropboxConnect", function (my_client_id) {
      var gadget = this;

      return new RSVP.Queue()
        .push(function () {
          return gadget.getDropboxConnect(
            "https://www.dropbox.com/1/oauth2/authorize?" +
              "client_id=" + my_client_id +
              "&response_type=token" +
              "&state=" + setState() +
              "&redirect_uri=" + window.location.href,
            "",
            "width=480,height=480,resizable=yes,scrollbars=yes,status=yes"
          );
        })
        .push(function (my_oauth_dict) {
          return my_oauth_dict;
        });
    })

    .declareMethod("initializeDropboxConnection", function () {

      // the oauth popup will open same page and we will end up at this line, too,
      // but when inside the popup, the opener must be set
      if (window.opener === null) {
        return;
      }
      return new RSVP.Queue()
        .push(function () {

          // window.opener returns reference to  window that opened this window
          // https://developer.mozilla.org/en-US/docs/Web/API/Window/opener
          // this passes the token to the promise waiting above
          return window.opener.popup_resolver(
            window.location.hash.replace("#", "?")
          );
        })
        .push(function () {
          window.close();
          return;
        });
    });

}(window, rJS, RSVP));
