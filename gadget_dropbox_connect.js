/*jslint nomen: true, indent: 2, maxlen: 80 */
/*global window, rJS, RSVP */
(function (window, rJS, RSVP) {
  "use strict";

  /////////////////////////////
  // parameters
  /////////////////////////////
  var SESSION = "session_jio";
  var STATE = "state";
  var SLASH = "/";

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

  rJS(window)

    /////////////////////////////
    // ready
    /////////////////////////////
    .ready(function () {
      this.property_dict = {};
      return this.initializeDropbox();
    })

    /////////////////////////////
    // declared methods
    /////////////////////////////

    // jio bridge
    .declareMethod("route", function (my_scope, my_call, my_p1, my_p2, my_p3) {
      return this.getDeclaredGadget(my_scope)
        .push(function (my_gadget) {
          return my_gadget[my_call](my_p1, my_p2, my_p3);
        });
    })
    .declareMethod("session_create", function (my_option_dict) {
      return this.route(SESSION, "createJIO", my_option_dict);
    })
    .declareMethod("session_getAttachment", function (my_id, my_tag, my_dict) {
      return this.route(SESSION, "getAttachment", my_id, my_tag, my_dict);
    })
    .declareMethod("session_putAttachment", function (my_id, my_tag, my_dict) {
      return this.route(SESSION, "putAttachment", my_id, my_tag, my_dict);
    })
    .declareMethod("session_removeAttachment", function (my_id, my_tag) {
      return this.route(SESSION, "removeAttachment", my_id, my_tag);
    })

    .declareMethod("getDropbox", function (my_url, my_name, my_config) {
      var gadget = this;
      var popup;
      var popup_resolver;
      var resolver = new Promise(function (resolve, reject) {
        popup_resolver = function resolver(href) {
          return gadget.session_getAttachment(SLASH, STATE, {"format": "text"})
            .push(function (state) {
              var test = getUrlParameter("state", href);

              // already logged in
              if (test && state === test) {
                return gadget.session_removeAttachment(SLASH, STATE)
                  .push(function () {
                    return resolve({
                      "access_token": getUrlParameter("access_token", href),
                      "uid": getUrlParameter("uid", href),
                      "type": getUrlParameter("token_type", href)
                    });
                  });
              } else {
                return reject("forbidden");
              }
            });
        };

        popup = window.open(my_url, my_name, my_config);
        popup.opener.popup_resolver = popup_resolver;
        return window.promiseEventListener(popup, "load", true);
      });

      // Note: no longer RSVP.any with a timeout. if popup throws, we're stuck.
      return new RSVP.Queue()
        .push(function () {
          return resolver;
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
      var gadget = this;
      return new RSVP.Queue()
        .push(function () {
          return gadget.createState();
        })
        .push(function () {
          return gadget.getDropbox(
            "https://www.dropbox.com/oauth2/authorize?" +
              "client_id=" + my_client_id +
              "&response_type=token" +
              "&state=" + gadget.property_dict.state +
              "&redirect_uri=" + window.location.href,
            "",
            "width=480,height=480,resizable=yes,scrollbars=yes,status=yes"
          );
        });
    })

    .declareMethod("initializeDropbox", function () {

      // the oauth popup will open same page and we will end up here, too,
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
    })

    /////////////////////////////
    // declared jobs
    /////////////////////////////
    .declareJob("createState", function () {
      this.property_dict.state = uuid();
      return this.session_putAttachment(SLASH, STATE, new Blob(
        [this.property_dict.state], {type: "text/plain"})
      );
    })

    /////////////////////////////
    // declared service
    /////////////////////////////
    .declareService(function () {
      return this.session_create({"type": "local", "sessiononly": true});
    });

}(window, rJS, RSVP));
